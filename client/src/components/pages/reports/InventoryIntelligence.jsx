import { useMemo } from "react";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-UG", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

const getProductName = (product) => {
  return (
    product?.name ||
    product?.productName ||
    product?.product?.name ||
    "Unknown Product"
  );
};

const getQuantity = (product) => {
  return Number(
    product?.quantity ??
      product?.stock ??
      product?.currentStock ??
      product?.stockQuantity ??
      product?.availableQuantity ??
      0
  );
};

const getMinStock = (product) => {
  return Number(
    product?.minStock ??
      product?.minimumStock ??
      product?.reorderLevel ??
      product?.lowStockThreshold ??
      0
  );
};

const getBuyingPrice = (product) => {
  return Number(
    product?.buyingPrice ??
      product?.costPrice ??
      product?.purchasePrice ??
      product?.unitCost ??
      product?.product?.buyingPrice ??
      0
  );
};

const getSellingPrice = (product) => {
  return Number(
    product?.sellingPrice ??
      product?.price ??
      product?.unitPrice ??
      product?.product?.sellingPrice ??
      0
  );
};

const getUnitsSold = (product) => {
  return Number(
    product?.unitsSold ??
      product?.quantitySold ??
      product?.sold ??
      product?.salesQuantity ??
      product?.totalQuantity ??
      0
  );
};

const getRevenue = (product) => {
  return Number(
    product?.revenue ??
      product?.sales ??
      product?.salesValue ??
      product?.totalSales ??
      product?.amount ??
      0
  );
};

const getStockStatus = (quantity, minStock) => {
  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (minStock > 0 && quantity <= minStock) {
    return "LOW";
  }

  if (minStock > 0 && quantity <= minStock * 1.5) {
    return "WATCH";
  }

  return "HEALTHY";
};

const getStatusClasses = (status) => {
  const classes = {
    OUT_OF_STOCK: "bg-red-50 text-red-700",
    LOW: "bg-orange-50 text-orange-700",
    WATCH: "bg-amber-50 text-amber-700",
    HEALTHY: "bg-emerald-50 text-emerald-700",
  };

  return classes[status] || classes.HEALTHY;
};

const MetricCard = ({
  title,
  value,
  description,
  icon,
  tone = "slate",
}) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`shrink-0 rounded-xl p-2.5 ${
            tones[tone] || tones.slate
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const InsightCard = ({
  icon,
  title,
  description,
  tone = "slate",
}) => {
  const tones = {
    slate: {
      wrapper: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
    },

    green: {
      wrapper: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
    },

    amber: {
      wrapper: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
    },

    red: {
      wrapper: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-700",
    },

    blue: {
      wrapper: "border-blue-200 bg-blue-50",
      icon: "bg-blue-100 text-blue-700",
    },
  };

  const selected = tones[tone] || tones.slate;

  return (
    <div
      className={`rounded-2xl border p-5 ${selected.wrapper}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`rounded-xl p-2.5 ${selected.icon}`}
        >
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const labels = {
    OUT_OF_STOCK: "OUT OF STOCK",
    LOW: "LOW STOCK",
    WATCH: "WATCH",
    HEALTHY: "HEALTHY",
  };

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusClasses(
        status
      )}`}
    >
      {labels[status] || "HEALTHY"}
    </span>
  );
};

const InventoryIntelligence = ({
  inventory = [],
  products = [],
}) => {
  /*
   * The component accepts either:
   *
   * inventory={[]}
   *
   * or
   *
   * products={[]}
   *
   * This makes it compatible with different report
   * response structures.
   */

  const sourceProducts =
    Array.isArray(inventory) && inventory.length
      ? inventory
      : Array.isArray(products)
      ? products
      : [];

  const normalizedProducts = useMemo(() => {
    return sourceProducts.map((product) => {
      const quantity = getQuantity(product);
      const minStock = getMinStock(product);
      const buyingPrice = getBuyingPrice(product);
      const sellingPrice = getSellingPrice(product);
      const unitsSold = getUnitsSold(product);
      const revenue = getRevenue(product);

      const stockValue = quantity * buyingPrice;

      const potentialRevenue =
        quantity * sellingPrice;

      const potentialProfit =
        quantity * (sellingPrice - buyingPrice);

      const status = getStockStatus(
        quantity,
        minStock
      );

      return {
        original: product,
        name: getProductName(product),
        sku:
          product?.sku ||
          product?.product?.sku ||
          "—",
        quantity,
        minStock,
        buyingPrice,
        sellingPrice,
        unitsSold,
        revenue,
        stockValue,
        potentialRevenue,
        potentialProfit,
        status,
      };
    });
  }, [sourceProducts]);

  const metrics = useMemo(() => {
    const totalProducts =
      normalizedProducts.length;

    const totalUnits =
      normalizedProducts.reduce(
        (sum, product) =>
          sum + product.quantity,
        0
      );

    const inventoryValue =
      normalizedProducts.reduce(
        (sum, product) =>
          sum + product.stockValue,
        0
      );

    const potentialRevenue =
      normalizedProducts.reduce(
        (sum, product) =>
          sum + product.potentialRevenue,
        0
      );

    const potentialProfit =
      normalizedProducts.reduce(
        (sum, product) =>
          sum + product.potentialProfit,
        0
      );

    const lowStockProducts =
      normalizedProducts.filter(
        (product) =>
          product.status === "LOW"
      );

    const outOfStockProducts =
      normalizedProducts.filter(
        (product) =>
          product.status ===
          "OUT_OF_STOCK"
      );

    const watchProducts =
      normalizedProducts.filter(
        (product) =>
          product.status === "WATCH"
      );

    const healthyProducts =
      normalizedProducts.filter(
        (product) =>
          product.status === "HEALTHY"
      );

    const totalUnitsSold =
      normalizedProducts.reduce(
        (sum, product) =>
          sum + product.unitsSold,
        0
      );

    return {
      totalProducts,
      totalUnits,
      inventoryValue,
      potentialRevenue,
      potentialProfit,
      lowStockProducts,
      outOfStockProducts,
      watchProducts,
      healthyProducts,
      totalUnitsSold,
    };
  }, [normalizedProducts]);

  const fastMovingProducts = useMemo(() => {
    return [...normalizedProducts]
      .filter(
        (product) =>
          product.unitsSold > 0
      )
      .sort(
        (a, b) =>
          b.unitsSold - a.unitsSold
      )
      .slice(0, 5);
  }, [normalizedProducts]);

  const slowMovingProducts = useMemo(() => {
    return [...normalizedProducts]
      .filter(
        (product) =>
          product.unitsSold === 0
      )
      .sort(
        (a, b) =>
          b.stockValue - a.stockValue
      )
      .slice(0, 5);
  }, [normalizedProducts]);

  const reorderProducts = useMemo(() => {
    return [...normalizedProducts]
      .filter(
        (product) =>
          product.status === "LOW" ||
          product.status ===
            "OUT_OF_STOCK"
      )
      .sort((a, b) => {
        if (
          a.status ===
            "OUT_OF_STOCK" &&
          b.status !== "OUT_OF_STOCK"
        ) {
          return -1;
        }

        if (
          b.status ===
            "OUT_OF_STOCK" &&
          a.status !== "OUT_OF_STOCK"
        ) {
          return 1;
        }

        return a.quantity - b.quantity;
      })
      .slice(0, 8);
  }, [normalizedProducts]);

  const topValueProducts = useMemo(() => {
    return [...normalizedProducts]
      .sort(
        (a, b) =>
          b.stockValue - a.stockValue
      )
      .slice(0, 5);
  }, [normalizedProducts]);

  const inventoryHealth = useMemo(() => {
    if (!normalizedProducts.length) {
      return 0;
    }

    return (
      (metrics.healthyProducts.length /
        normalizedProducts.length) *
      100
    );
  }, [metrics, normalizedProducts]);

  const highestRiskProduct =
    reorderProducts[0] || null;

  if (!normalizedProducts.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Boxes className="h-7 w-7" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Inventory Intelligence
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            MOVA needs inventory data to analyze stock
            levels, fast-moving products, slow-moving
            products and reorder risks.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Record products and stock quantities to
            activate inventory intelligence.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-950 p-2.5 text-white">
            <Boxes className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Inventory Intelligence
            </h2>

            <p className="text-sm text-slate-500">
              MOVA analyzes your stock and highlights
              inventory risks and opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* METRICS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Inventory Value"
          value={formatUGX(
            metrics.inventoryValue
          )}
          description={`${formatNumber(
            metrics.totalUnits
          )} units in stock`}
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
          tone="blue"
        />

        <MetricCard
          title="Low Stock"
          value={formatNumber(
            metrics.lowStockProducts.length
          )}
          description="Products needing attention"
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
          tone={
            metrics.lowStockProducts.length
              ? "amber"
              : "green"
          }
        />

        <MetricCard
          title="Out of Stock"
          value={formatNumber(
            metrics.outOfStockProducts.length
          )}
          description="Products currently unavailable"
          icon={
            <ShieldAlert className="h-5 w-5" />
          }
          tone={
            metrics.outOfStockProducts.length
              ? "red"
              : "green"
          }
        />

        <MetricCard
          title="Potential Revenue"
          value={formatUGX(
            metrics.potentialRevenue
          )}
          description="Value if current stock sells"
          icon={
            <TrendingUp className="h-5 w-5" />
          }
          tone="green"
        />
      </div>

      {/* HEALTH */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Inventory health
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-900">
              {inventoryHealth >= 80
                ? "Healthy inventory"
                : inventoryHealth >= 50
                ? "Inventory needs attention"
                : "High inventory risk"}
            </h3>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {inventoryHealth >= 80
                ? "Most products are currently above their minimum stock levels."
                : inventoryHealth >= 50
                ? "Several products require monitoring or replenishment."
                : "A significant portion of your inventory requires immediate attention."}
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-3xl font-bold text-slate-900">
              {inventoryHealth.toFixed(0)}%
            </p>

            <p className="text-xs text-slate-500">
              healthy products
            </p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              inventoryHealth >= 80
                ? "bg-emerald-500"
                : inventoryHealth >= 50
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{
              width: `${Math.min(
                inventoryHealth,
                100
              )}%`,
            }}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700">
              Healthy
            </p>

            <p className="mt-1 text-lg font-bold text-emerald-800">
              {metrics.healthyProducts.length}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700">
              Watch
            </p>

            <p className="mt-1 text-lg font-bold text-amber-800">
              {metrics.watchProducts.length}
            </p>
          </div>

          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">
              Critical
            </p>

            <p className="mt-1 text-lg font-bold text-red-800">
              {metrics.outOfStockProducts.length +
                metrics.lowStockProducts.length}
            </p>
          </div>
        </div>
      </section>

      {/* INSIGHTS */}

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          icon={
            <Zap className="h-5 w-5" />
          }
          title="Fast-moving stock"
          description={
            fastMovingProducts.length
              ? `${getProductName(
                  fastMovingProducts[0].original
                )} is currently the fastest-moving product with ${formatNumber(
                  fastMovingProducts[0].unitsSold
                )} units sold.`
              : "There is not enough sales movement data to identify a fast-moving product."
          }
          tone="blue"
        />

        <InsightCard
          icon={
            <TrendingDown className="h-5 w-5" />
          }
          title="Slow-moving stock"
          description={
            slowMovingProducts.length
              ? `${getProductName(
                  slowMovingProducts[0].original
                )} has stock value of ${formatUGX(
                  slowMovingProducts[0].stockValue
                )} but no recorded units sold.`
              : "No obvious slow-moving stock has been identified."
          }
          tone="amber"
        />

        <InsightCard
          icon={
            <RefreshCw className="h-5 w-5" />
          }
          title="Reorder priority"
          description={
            highestRiskProduct
              ? `${highestRiskProduct.name} ${
                  highestRiskProduct.status ===
                  "OUT_OF_STOCK"
                    ? "is out of stock"
                    : "is below its minimum stock level"
                }.`
              : "No immediate reorder risk has been detected."
          }
          tone={
            highestRiskProduct
              ? "red"
              : "green"
          }
        />
      </div>

      {/* REORDER TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Reorder Recommendations
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Products that require replenishment attention.
            </p>
          </div>

          <ShoppingCart className="h-5 w-5 text-slate-400" />
        </div>

        {reorderProducts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Package className="h-6 w-6" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No immediate reorder recommendations
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Your current stock levels look healthy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Product
                  </th>

                  <th className="px-5 py-3">
                    SKU
                  </th>

                  <th className="px-5 py-3">
                    Current Stock
                  </th>

                  <th className="px-5 py-3">
                    Minimum
                  </th>

                  <th className="px-5 py-3">
                    Stock Value
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {reorderProducts.map(
                  (product, index) => (
                    <tr
                      key={
                        product.original?._id ||
                        product.original?.productId ||
                        `${product.name}-${index}`
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {product.name}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {product.sku}
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {formatNumber(
                          product.quantity
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {formatNumber(
                          product.minStock
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-700">
                        {formatUGX(
                          product.stockValue
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge
                          status={
                            product.status
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FAST MOVING */}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Zap className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Fast-Moving Products
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Products selling the most units.
                </p>
              </div>
            </div>
          </div>

          {fastMovingProducts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No sales movement data available.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fastMovingProducts.map(
                (product, index) => (
                  <div
                    key={
                      product.original?._id ||
                      `${product.name}-${index}`
                    }
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatNumber(
                            product.quantity
                          )}{" "}
                          units remaining
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {formatNumber(
                          product.unitsSold
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        sold
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* SLOW MOVING */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <TrendingDown className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Slow-Moving Stock
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Stock that may be tying up capital.
                </p>
              </div>
            </div>
          </div>

          {slowMovingProducts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No obvious slow-moving products detected.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {slowMovingProducts.map(
                (product, index) => (
                  <div
                    key={
                      product.original?._id ||
                      `${product.name}-${index}`
                    }
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatNumber(
                            product.quantity
                          )}{" "}
                          units in stock
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {formatUGX(
                          product.stockValue
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        stock value
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* STOCK VALUE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                Inventory Value Concentration
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Products holding the largest share of your stock investment.
              </p>
            </div>

            <CircleDollarSign className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {topValueProducts.map(
            (product, index) => {
              const share =
                metrics.inventoryValue > 0
                  ? (product.stockValue /
                      metrics.inventoryValue) *
                    100
                  : 0;

              return (
                <div
                  key={
                    product.original?._id ||
                    `${product.name}-${index}`
                  }
                  className="px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatNumber(
                            product.quantity
                          )}{" "}
                          units
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {formatUGX(
                          product.stockValue
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        {share.toFixed(1)}% of inventory
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${Math.min(
                          share,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* FINAL INTELLIGENCE */}

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-white/10 p-2">
                <Zap className="h-5 w-5" />
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                MOVA Intelligence
              </p>
            </div>

            <h3 className="mt-3 text-xl font-bold">
              {metrics.outOfStockProducts.length > 0
                ? "Prioritize stock replenishment."
                : metrics.lowStockProducts.length > 0
                ? "Monitor low-stock products closely."
                : metrics.totalUnitsSold > 0
                ? "Your inventory is actively moving."
                : "Start recording sales to unlock deeper inventory insights."}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {metrics.outOfStockProducts.length > 0
                ? `${metrics.outOfStockProducts.length} product${
                    metrics.outOfStockProducts.length === 1
                      ? ""
                      : "s"
                  } currently have no stock. Replenishing these products could prevent missed sales.`
                : metrics.lowStockProducts.length > 0
                ? `${metrics.lowStockProducts.length} product${
                    metrics.lowStockProducts.length === 1
                      ? ""
                      : "s"
                  } are at or below their minimum stock levels. Review your supplier and purchasing plans.`
                : metrics.totalUnitsSold > 0
                ? `Your products have recorded ${formatNumber(
                    metrics.totalUnitsSold
                  )} units sold. Use the fast-moving list to prioritize products that deserve consistent availability.`
                : "Once MOVA has enough sales history, it can provide stronger movement and reorder recommendations."}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Potential Stock Profit
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatUGX(
                metrics.potentialProfit
              )}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              {metrics.potentialProfit >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}

              If all current stock sells
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};

export default InventoryIntelligence;