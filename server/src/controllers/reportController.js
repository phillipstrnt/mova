import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getBusinessId = (req) => {
  return (
    req.user?.businessId ||
    req.businessId ||
    null
  );
};

const getBranchId = (req) => {
  return (
    req.user?.activeBranchId ||
    req.user?.branchId ||
    null
  );
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const isValidDate = (
  value
) => {
  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

const getDateRange = (
  startDate,
  endDate
) => {
  const start =
    new Date(
      startDate
    );

  start.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(
      endDate
    );

  end.setHours(
    23,
    59,
    59,
    999
  );

  return {
    $gte: start,
    $lte: end,
  };
};

const getSaleTotal = (
  sale
) => {
  return toNumber(
    sale?.total ??
      sale?.grandTotal ??
      sale?.amount
  );
};

const getSaleStatus = (
  sale
) => {
  return (
    sale?.status ||
    "COMPLETED"
  )
    .toString()
    .toUpperCase();
};

const isCancelled = (
  sale
) => {
  return (
    getSaleStatus(
      sale
    ) === "CANCELLED"
  );
};

const buildBaseFilter = (
  req
) => {
  const businessId =
    getBusinessId(req);

  const branchId =
    getBranchId(req);

  const filter = {
    businessId,
  };

  if (branchId) {
    filter.branchId =
      branchId;
  }

  return filter;
};

const getRequestedDates = (
  req
) => {
  const now =
    new Date();

  const defaultStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  const defaultEnd =
    new Date(now);

  const requestedStart =
    req.query.startDate;

  const requestedEnd =
    req.query.endDate;

  const start =
    requestedStart &&
    isValidDate(
      requestedStart
    )
      ? new Date(
          requestedStart
        )
      : defaultStart;

  const end =
    requestedEnd &&
    isValidDate(
      requestedEnd
    )
      ? new Date(
          requestedEnd
        )
      : defaultEnd;

  start.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    23,
    59,
    59,
    999
  );

  return {
    start,
    end,
  };
};

/*
|--------------------------------------------------------------------------
| GENERAL REPORTS
|--------------------------------------------------------------------------
| GET /api/reports
|--------------------------------------------------------------------------
*/

export const getReports =
  async (
    req,
    res
  ) => {
    try {
      const businessId =
        getBusinessId(req);

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message:
            "Business context is missing.",
        });
      }

      const {
        start,
        end,
      } =
        getRequestedDates(
          req
        );

      const baseFilter =
        buildBaseFilter(
          req
        );

      const dateFilter = {
        ...baseFilter,

        createdAt:
          getDateRange(
            start,
            end
          ),
      };

      const [
        sales,
        expenses,
      ] =
        await Promise.all([
          Sale.find(
            dateFilter
          )
            .sort({
              createdAt: -1,
            })
            .lean(),

          Expense.find(
            dateFilter
          )
            .sort({
              createdAt: -1,
            })
            .lean(),
        ]);

      const activeSales =
        sales.filter(
          (sale) =>
            !isCancelled(
              sale
            )
        );

      const revenue =
        activeSales.reduce(
          (
            total,
            sale
          ) =>
            total +
            getSaleTotal(
              sale
            ),
          0
        );

      const expenseTotal =
        expenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            toNumber(
              expense.amount ??
                expense.total ??
                expense.cost
            ),
          0
        );

      const discounts =
        activeSales.reduce(
          (
            total,
            sale
          ) =>
            total +
            toNumber(
              sale.discount ??
                sale.discountAmount
            ),
          0
        );

      const averageSale =
        activeSales.length >
        0
          ? revenue /
            activeSales.length
          : 0;

      /*
      |--------------------------------------------------------------------------
      | PAYMENT BREAKDOWN
      |--------------------------------------------------------------------------
      */

      const paymentBreakdown =
        {};

      for (
        const sale of activeSales
      ) {
        const method =
          (
            sale.paymentMethod ||
            sale.paymentType ||
            "OTHER"
          )
            .toString()
            .toUpperCase();

        if (
          !paymentBreakdown[
            method
          ]
        ) {
          paymentBreakdown[
            method
          ] = 0;
        }

        paymentBreakdown[
          method
        ] += getSaleTotal(
          sale
        );
      }

      /*
      |--------------------------------------------------------------------------
      | DAILY SALES
      |--------------------------------------------------------------------------
      */

      const dailySales =
        [];

      const cursor =
        new Date(start);

      while (
        cursor <= end
      ) {
        const dayStart =
          new Date(
            cursor
          );

        dayStart.setHours(
          0,
          0,
          0,
          0
        );

        const dayEnd =
          new Date(
            dayStart
          );

        dayEnd.setHours(
          23,
          59,
          59,
          999
        );

        const daySales =
          activeSales.filter(
            (sale) => {
              const saleDate =
                new Date(
                  sale.createdAt
                );

              return (
                saleDate >=
                  dayStart &&
                saleDate <=
                  dayEnd
              );
            }
          );

        dailySales.push({
          date:
            dayStart
              .toISOString()
              .split(
                "T"
              )[0],

          revenue:
            daySales.reduce(
              (
                total,
                sale
              ) =>
                total +
                getSaleTotal(
                  sale
                ),
              0
            ),

          transactions:
            daySales.length,
        });

        cursor.setDate(
          cursor.getDate() +
            1
        );
      }

      return res.status(200).json({
        success: true,

        businessId,

        branchId:
          getBranchId(req),

        startDate:
          start.toISOString(),

        endDate:
          end.toISOString(),

        summary: {
          revenue,

          expenses:
            expenseTotal,

          averageSale,

          transactions:
            activeSales.length,

          discounts,

          cancelledSales:
            sales.filter(
              (sale) =>
                isCancelled(
                  sale
                )
            ).length,

          netResult:
            revenue -
            expenseTotal,

          /*
          |--------------------------------------------------------------------------
          | Profit is intentionally not fabricated.
          |--------------------------------------------------------------------------
          */

          profitAvailable:
            false,
        },

        paymentBreakdown,

        dailySales,

        recentTransactions:
          sales
            .slice(
              0,
              20
            ),
      });
    } catch (
      error
    ) {
      console.error(
        "General reports error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load reports.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| SALES REPORT
|--------------------------------------------------------------------------
| GET /api/reports/sales
|--------------------------------------------------------------------------
*/

export const getSalesReport =
  async (
    req,
    res
  ) => {
    try {
      const businessId =
        getBusinessId(req);

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message:
            "Business context is missing.",
        });
      }

      const {
        start,
        end,
      } =
        getRequestedDates(
          req
        );

      const filter =
        buildBaseFilter(
          req
        );

      filter.createdAt =
        getDateRange(
          start,
          end
        );

      const sales =
        await Sale.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .populate(
            "customerId",
            "name phone email"
          )
          .populate(
            "userId",
            "name email"
          )
          .lean();

      const activeSales =
        sales.filter(
          (sale) =>
            !isCancelled(
              sale
            )
        );

      const revenue =
        activeSales.reduce(
          (
            total,
            sale
          ) =>
            total +
            getSaleTotal(
              sale
            ),
          0
        );

      const discounts =
        activeSales.reduce(
          (
            total,
            sale
          ) =>
            total +
            toNumber(
              sale.discount ??
                sale.discountAmount
            ),
          0
        );

      /*
      |--------------------------------------------------------------------------
      | PRODUCT PERFORMANCE
      |--------------------------------------------------------------------------
      */

      const productMap =
        new Map();

      for (
        const sale of activeSales
      ) {
        if (
          !Array.isArray(
            sale.items
          )
        ) {
          continue;
        }

        for (
          const item of sale.items
        ) {
          const productId =
            item.productId ||
            item.product?._id ||
            item._id ||
            item.name;

          const key =
            String(
              productId ||
                "unknown"
            );

          const quantity =
            toNumber(
              item.quantity
            );

          const unitPrice =
            toNumber(
              item.sellingPrice ??
                item.price ??
                item.unitPrice
            );

          const existing =
            productMap.get(
              key
            ) || {
              productId:
                item.productId ||
                null,

              name:
                item.name ||
                item.productName ||
                "Unknown Product",

              quantity: 0,

              revenue: 0,
            };

          existing.quantity +=
            quantity;

          existing.revenue +=
            quantity *
            unitPrice;

          productMap.set(
            key,
            existing
          );
        }
      }

      const productPerformance =
        Array.from(
          productMap.values()
        )
          .sort(
            (
              a,
              b
            ) =>
              b.revenue -
              a.revenue
          )
          .slice(
            0,
            20
          );

      /*
      |--------------------------------------------------------------------------
      | PAYMENT BREAKDOWN
      |--------------------------------------------------------------------------
      */

      const paymentBreakdown =
        {};

      for (
        const sale of activeSales
      ) {
        const method =
          (
            sale.paymentMethod ||
            sale.paymentType ||
            "OTHER"
          )
            .toString()
            .toUpperCase();

        if (
          !paymentBreakdown[
            method
          ]
        ) {
          paymentBreakdown[
            method
          ] = 0;
        }

        paymentBreakdown[
          method
        ] += getSaleTotal(
          sale
        );
      }

      return res.status(200).json({
        success: true,

        businessId,

        branchId:
          getBranchId(req),

        startDate:
          start.toISOString(),

        endDate:
          end.toISOString(),

        summary: {
          revenue,

          transactions:
            activeSales.length,

          averageSale:
            activeSales.length >
            0
              ? revenue /
                activeSales.length
              : 0,

          discounts,

          cancelledSales:
            sales.filter(
              (sale) =>
                isCancelled(
                  sale
                )
            ).length,

          profitAvailable:
            false,
        },

        paymentBreakdown,

        productPerformance,

        sales:
          activeSales,
      });
    } catch (
      error
    ) {
      console.error(
        "Sales report error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load sales report.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| PAYMENTS REPORT
|--------------------------------------------------------------------------
| GET /api/reports/payments
|--------------------------------------------------------------------------
|
| This uses completed sales/payment information already stored in Sale.
| It avoids depending on a separate PaymentTransaction model.
|
|--------------------------------------------------------------------------
*/

export const getPaymentsReport =
  async (
    req,
    res
  ) => {
    try {
      const businessId =
        getBusinessId(req);

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message:
            "Business context is missing.",
        });
      }

      const {
        start,
        end,
      } =
        getRequestedDates(
          req
        );

      const filter =
        buildBaseFilter(
          req
        );

      filter.createdAt =
        getDateRange(
          start,
          end
        );

      const sales =
        await Sale.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .lean();

      const activeSales =
        sales.filter(
          (sale) =>
            !isCancelled(
              sale
            )
        );

      const methodMap =
        {};

      for (
        const sale of activeSales
      ) {
        const method =
          (
            sale.paymentMethod ||
            sale.paymentType ||
            "OTHER"
          )
            .toString()
            .toUpperCase();

        const amount =
          getSaleTotal(
            sale
          );

        if (
          !methodMap[
            method
          ]
        ) {
          methodMap[
            method
          ] = {
            method,

            amount: 0,

            transactions: 0,
          };
        }

        methodMap[
          method
        ].amount +=
          amount;

        methodMap[
          method
        ].transactions +=
          1;
      }

      const methods =
        Object.values(
          methodMap
        ).sort(
          (
            a,
            b
          ) =>
            b.amount -
            a.amount
        );

      const total =
        activeSales.reduce(
          (
            sum,
            sale
          ) =>
            sum +
            getSaleTotal(
              sale
            ),
          0
        );

      return res.status(200).json({
        success: true,

        businessId,

        branchId:
          getBranchId(req),

        startDate:
          start.toISOString(),

        endDate:
          end.toISOString(),

        summary: {
          total,

          transactions:
            activeSales.length,

          methods:
            methods.length,
        },

        paymentBreakdown:
          methods,

        payments:
          activeSales.map(
            (sale) => ({
              _id:
                sale._id,

              receiptNumber:
                sale.receiptNumber ||
                sale.saleNumber ||
                null,

              paymentMethod:
                sale.paymentMethod ||
                sale.paymentType ||
                "OTHER",

              amount:
                getSaleTotal(
                  sale
                ),

              status:
                sale.status ||
                "COMPLETED",

              createdAt:
                sale.createdAt,
            })
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Payments report error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load payments report.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };