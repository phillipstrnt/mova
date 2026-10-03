
import mongoose from "mongoose";

import Product from "../models/Product.js";
import Category from "../models/Category.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Branch from "../models/Branch.js";

const getActiveBranchId = (req) => {
  return (
    req.user?.activeBranchId?._id ||
    req.user?.activeBranchId ||
    req.user?.branchId ||
    req.branchId ||
    null
  );
};

/* ============================================================
   CREATE PRODUCT
============================================================ */

const createProduct = async (
  req,
  res
) => {
  try {
    const {
      name,
      sku,
      barcode = "",
      description = "",
      categoryId = null,
      buyingPrice,
      sellingPrice,
      stockQuantity = 0,
      minimumStock = 0,
      image = "",
      unit = "piece",
      trackStock = true,
    } = req.body;

    const businessId =
      req.user.businessId;

    const branchId =
      getActiveBranchId(req);

    /*
     * ========================================================
     * VALIDATE ACTIVE BRANCH
     * ========================================================
     */

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "No active branch is selected. Please select a branch before creating a product.",
      });
    }

    const branch =
      await Branch.findOne({
        _id: branchId,
        businessId,
        isActive: true,
      });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "The selected branch is invalid or inactive.",
      });
    }

    /*
     * ========================================================
     * VALIDATE NAME
     * ========================================================
     */

    if (
      !name ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    /*
     * ========================================================
     * VALIDATE SKU
     * ========================================================
     */

    if (
      !sku ||
      !sku.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "SKU is required",
      });
    }

    /*
     * ========================================================
     * VALIDATE PRICES
     * ========================================================
     */

    if (
      buyingPrice ===
        undefined ||
      buyingPrice === null ||
      Number.isNaN(
        Number(buyingPrice)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid buying price is required",
      });
    }

    if (
      sellingPrice ===
        undefined ||
      sellingPrice === null ||
      Number.isNaN(
        Number(sellingPrice)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid selling price is required",
      });
    }

    const numericBuyingPrice =
      Number(buyingPrice);

    const numericSellingPrice =
      Number(sellingPrice);

    const numericStock =
      Number(stockQuantity);

    const numericMinimumStock =
      Number(minimumStock);

    if (
      numericBuyingPrice < 0 ||
      numericSellingPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Prices cannot be negative",
      });
    }

    if (
      numericSellingPrice <
      numericBuyingPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price cannot be lower than buying price",
      });
    }

    if (
      Number.isNaN(
        numericStock
      ) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock quantity cannot be negative",
      });
    }

    if (
      Number.isNaN(
        numericMinimumStock
      ) ||
      numericMinimumStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum stock cannot be negative",
      });
    }

    /*
     * ========================================================
     * VALIDATE CATEGORY
     * ========================================================
     */

    if (categoryId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          categoryId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category ID",
        });
      }

      const category =
        await Category.findOne({
          _id: categoryId,
          businessId,
          isActive: true,
        });

      if (!category) {
        return res.status(400).json({
          success: false,
          message:
            "Selected category was not found",
        });
      }
    }

    /*
     * ========================================================
     * NORMALIZE SKU
     * ========================================================
     */

    const normalizedSku =
      sku
        .trim()
        .toUpperCase();

    const existingSku =
      await Product.findOne({
        businessId,
        sku: normalizedSku,
      });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message:
          "A product with this SKU already exists",
      });
    }

    /*
     * ========================================================
     * VALIDATE BARCODE
     * ========================================================
     */

    const normalizedBarcode =
      barcode?.trim() || "";

    if (normalizedBarcode) {
      const existingBarcode =
        await Product.findOne({
          businessId,
          barcode:
            normalizedBarcode,
        });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message:
            "A product with this barcode already exists",
        });
      }
    }

    /*
     * ========================================================
     * CREATE PRODUCT MASTER
     * ========================================================
     */

    const product =
      await Product.create({
        businessId,
        categoryId:
          categoryId || null,
        name: name.trim(),
        sku: normalizedSku,
        barcode:
          normalizedBarcode,
        description:
          description.trim(),
        buyingPrice:
          numericBuyingPrice,
        sellingPrice:
          numericSellingPrice,

        /*
         * Retained for backward compatibility.
         * Branch-aware stock is stored separately.
         */
        stockQuantity:
          numericStock,

        minimumStock:
          numericMinimumStock,

        image:
          image?.trim() || "",

        unit:
          unit?.trim() ||
          "piece",

        trackStock:
          Boolean(trackStock),
      });

    /*
     * ========================================================
     * CREATE BRANCH STOCK
     * ========================================================
     */

    const branchStock =
      await ProductBranchStock.create({
        businessId,
        productId:
          product._id,
        branchId,
        stockQuantity:
          numericStock,
        minimumStock:
          numericMinimumStock,
        lastStockUpdate:
          new Date(),
      });

    /*
     * ========================================================
     * RETURN PRODUCT
     * ========================================================
     */

    const populatedProduct =
      await Product.findById(
        product._id
      ).populate(
        "categoryId",
        "name"
      );

    const productResponse =
      populatedProduct.toObject();

    productResponse.stockQuantity =
      branchStock.stockQuantity;

    productResponse.branchStock =
      branchStock.stockQuantity;

    productResponse.branchId =
      branchId;

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      product:
        productResponse,
      branchStock,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create product",
    });
  }
};

/* ============================================================
   GET PRODUCTS
============================================================ */

const getProducts = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      categoryId,
      status = "active",
      lowStock,
      page = 1,
      limit = 20,
    } = req.query;

    const businessId =
      req.user.businessId;

    const branchId =
      getActiveBranchId(req);

    const filter = {
      businessId,
    };

    if (search.trim()) {
      const searchRegex =
        new RegExp(
          search.trim(),
          "i"
        );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          sku: searchRegex,
        },
        {
          barcode:
            searchRegex,
        },
      ];
    }

    if (categoryId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          categoryId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category ID",
        });
      }

      filter.categoryId =
        categoryId;
    }

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const pageSize =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    const skip =
      (currentPage - 1) *
      pageSize;

    /*
     * ========================================================
     * GET PRODUCTS
     * ========================================================
     */

    let products =
      await Product.find(filter)
        .populate(
          "categoryId",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageSize)
        .lean();

    /*
     * ========================================================
     * ATTACH ACTIVE BRANCH STOCK
     * ========================================================
     */

    if (branchId) {
      const productIds =
        products.map(
          (product) =>
            product._id
        );

      const branchStocks =
        await ProductBranchStock.find(
          {
            businessId,
            branchId,
            productId: {
              $in:
                productIds,
            },
          }
        ).lean();

      const stockMap =
        new Map();

      branchStocks.forEach(
        (stock) => {
          stockMap.set(
            stock.productId.toString(),
            stock
          );
        }
      );

      products =
        products.map(
          (product) => {
            const stock =
              stockMap.get(
                product._id.toString()
              );

            const branchQuantity =
              stock
                ? stock.stockQuantity
                : 0;

            const branchMinimum =
              stock
                ? stock.minimumStock
                : product.minimumStock;

            return {
              ...product,

              /*
               * Keep stockQuantity in the API response
               * so the existing frontend continues working.
               */
              stockQuantity:
                branchQuantity,

              branchStock:
                branchQuantity,

              minimumStock:
                branchMinimum,

              branchId,
            };
          }
        );

      /*
       * Low stock must use branch stock,
       * not the legacy Product.stockQuantity.
       */

      if (
        lowStock === "true"
      ) {
        products =
          products.filter(
            (product) =>
              product.stockQuantity <=
              product.minimumStock
          );
      }
    }

    const total =
      await Product.countDocuments(
        filter
      );

    return res.status(200).json({
      success: true,
      products,
      activeBranchId:
        branchId,
      pagination: {
        page:
          currentPage,
        limit:
          pageSize,
        total,
        pages:
          Math.ceil(
            total /
              pageSize
          ),
      },
    });
  } catch (error) {
    console.error(
      "Get products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve products",
    });
  }
};

/* ============================================================
   GET PRODUCT BY ID
============================================================ */

const getProductById =
  async (
    req,
    res
  ) => {
    try {
      const businessId =
        req.user.businessId;

      const branchId =
        getActiveBranchId(req);

      const product =
        await Product.findOne({
          _id:
            req.params.id,
          businessId,
        }).populate(
          "categoryId",
          "name"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      let branchStock =
        null;

      if (branchId) {
        branchStock =
          await ProductBranchStock.findOne(
            {
              businessId,
              productId:
                product._id,
              branchId,
            }
          ).lean();
      }

      const responseProduct =
        product.toObject();

      responseProduct.stockQuantity =
        branchStock
          ? branchStock.stockQuantity
          : 0;

      responseProduct.branchStock =
        branchStock
          ? branchStock.stockQuantity
          : 0;

      responseProduct.branchId =
        branchId;

      responseProduct.branchMinimumStock =
        branchStock
          ? branchStock.minimumStock
          : product.minimumStock;

      return res.status(200).json({
        success: true,
        product:
          responseProduct,
        branchStock,
      });
    } catch (error) {
      console.error(
        "Get product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve product",
      });
    }
  };

/* ============================================================
   UPDATE PRODUCT
============================================================ */

const updateProduct =
  async (
    req,
    res
  ) => {
    try {
      const businessId =
        req.user.businessId;

      const branchId =
        getActiveBranchId(req);

      const product =
        await Product.findOne({
          _id:
            req.params.id,
          businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const {
        name,
        sku,
        barcode,
        description,
        categoryId,
        buyingPrice,
        sellingPrice,
        stockQuantity,
        minimumStock,
        image,
        unit,
        trackStock,
      } = req.body;

      /*
       * ======================================================
       * NAME
       * ======================================================
       */

      if (
        name !== undefined
      ) {
        if (
          !name.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Product name cannot be empty",
          });
        }

        product.name =
          name.trim();
      }

      /*
       * ======================================================
       * SKU
       * ======================================================
       */

      if (
        sku !== undefined
      ) {
        const normalizedSku =
          sku
            .trim()
            .toUpperCase();

        if (
          !normalizedSku
        ) {
          return res.status(400).json({
            success: false,
            message:
              "SKU cannot be empty",
          });
        }

        const duplicate =
          await Product.findOne({
            businessId,
            sku:
              normalizedSku,
            _id: {
              $ne:
                product._id,
            },
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "A product with this SKU already exists",
          });
        }

        product.sku =
          normalizedSku;
      }

      /*
       * ======================================================
       * BARCODE
       * ======================================================
       */

      if (
        barcode !== undefined
      ) {
        const trimmedBarcode =
          barcode.trim();

        if (
          trimmedBarcode
        ) {
          const duplicate =
            await Product.findOne({
              businessId,
              barcode:
                trimmedBarcode,
              _id: {
                $ne:
                  product._id,
              },
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "A product with this barcode already exists",
            });
          }
        }

        product.barcode =
          trimmedBarcode;
      }

      /*
       * ======================================================
       * DESCRIPTION
       * ======================================================
       */

      if (
        description !==
        undefined
      ) {
        product.description =
          description.trim();
      }

      /*
       * ======================================================
       * CATEGORY
       * ======================================================
       */

      if (
        categoryId !==
        undefined
      ) {
        if (
          categoryId ===
            null ||
          categoryId ===
            ""
        ) {
          product.categoryId =
            null;
        } else {
          if (
            !mongoose.Types.ObjectId.isValid(
              categoryId
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid category ID",
            });
          }

          const category =
            await Category.findOne({
              _id:
                categoryId,
              businessId,
              isActive:
                true,
            });

          if (!category) {
            return res.status(400).json({
              success: false,
              message:
                "Selected category was not found",
            });
          }

          product.categoryId =
            categoryId;
        }
      }

      /*
       * ======================================================
       * BUYING PRICE
       * ======================================================
       */

      if (
        buyingPrice !==
        undefined
      ) {
        const value =
          Number(
            buyingPrice
          );

        if (
          Number.isNaN(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Buying price cannot be negative",
          });
        }

        product.buyingPrice =
          value;
      }

      /*
       * ======================================================
       * SELLING PRICE
       * ======================================================
       */

      if (
        sellingPrice !==
        undefined
      ) {
        const value =
          Number(
            sellingPrice
          );

        if (
          Number.isNaN(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selling price cannot be negative",
          });
        }

        product.sellingPrice =
          value;
      }

      if (
        product.sellingPrice <
        product.buyingPrice
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selling price cannot be lower than buying price",
        });
      }

      /*
       * ======================================================
       * STOCK
       * ======================================================
       *
       * IMPORTANT:
       *
       * Stock changes are now branch-specific.
       *
       * Do not directly change Product.stockQuantity.
       */

      if (
        stockQuantity !==
        undefined
      ) {
        if (
          !branchId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "No active branch is selected.",
          });
        }

        const numericStock =
          Number(
            stockQuantity
          );

        if (
          Number.isNaN(
            numericStock
          ) ||
          numericStock < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Stock quantity cannot be negative",
          });
        }

        let branchStock =
          await ProductBranchStock.findOne(
            {
              businessId,
              productId:
                product._id,
              branchId,
            }
          );

        if (
          !branchStock
        ) {
          branchStock =
            await ProductBranchStock.create(
              {
                businessId,
                productId:
                  product._id,
                branchId,
                stockQuantity:
                  numericStock,
                minimumStock:
                  product.minimumStock,
              }
            );
        } else {
          branchStock.stockQuantity =
            numericStock;

          branchStock.lastStockUpdate =
            new Date();

          await branchStock.save();
        }

        /*
         * Keep the old field synchronized
         * temporarily for compatibility.
         */
        product.stockQuantity =
          numericStock;
      }

      /*
       * ======================================================
       * MINIMUM STOCK
       * ======================================================
       */

      if (
        minimumStock !==
        undefined
      ) {
        const numericMinimum =
          Number(
            minimumStock
          );

        if (
          Number.isNaN(
            numericMinimum
          ) ||
          numericMinimum < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Minimum stock cannot be negative",
          });
        }

        product.minimumStock =
          numericMinimum;

        /*
         * Update the branch-specific
         * minimum stock as well.
         */
        if (branchId) {
          await ProductBranchStock.updateOne(
            {
              businessId,
              productId:
                product._id,
              branchId,
            },
            {
              $set: {
                minimumStock:
                  numericMinimum,
              },
            }
          );
        }
      }

      /*
       * ======================================================
       * OTHER FIELDS
       * ======================================================
       */

      if (
        image !==
        undefined
      ) {
        product.image =
          image.trim();
      }

      if (
        unit !==
        undefined
      ) {
        product.unit =
          unit.trim() ||
          "piece";
      }

      if (
        trackStock !==
        undefined
      ) {
        product.trackStock =
          Boolean(
            trackStock
          );
      }

      await product.save();

      const populatedProduct =
        await Product.findById(
          product._id
        ).populate(
          "categoryId",
          "name"
        );

      let currentBranchStock =
        null;

      if (branchId) {
        currentBranchStock =
          await ProductBranchStock.findOne(
            {
              businessId,
              productId:
                product._id,
              branchId,
            }
          ).lean();
      }

      const responseProduct =
        populatedProduct.toObject();

      responseProduct.stockQuantity =
        currentBranchStock
          ? currentBranchStock.stockQuantity
          : 0;

      responseProduct.branchStock =
        currentBranchStock
          ? currentBranchStock.stockQuantity
          : 0;

      responseProduct.branchId =
        branchId;

      return res.status(200).json({
        success: true,
        message:
          "Product updated successfully",
        product:
          responseProduct,
        branchStock:
          currentBranchStock,
      });
    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update product",
      });
    }
  };

/* ============================================================
   DEACTIVATE PRODUCT
============================================================ */

const deactivateProduct =
  async (
    req,
    res
  ) => {
    try {
      const product =
        await Product.findOne({
          _id:
            req.params.id,
          businessId:
            req.user.businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      product.isActive =
        false;

      await product.save();

      return res.status(200).json({
        success: true,
        message:
          "Product deactivated successfully",
        product,
      });
    } catch (error) {
      console.error(
        "Deactivate product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to deactivate product",
      });
    }
  };

/* ============================================================
   ACTIVATE PRODUCT
============================================================ */

const activateProduct =
  async (
    req,
    res
  ) => {
    try {
      const product =
        await Product.findOne({
          _id:
            req.params.id,
          businessId:
            req.user.businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      product.isActive =
        true;

      await product.save();

      return res.status(200).json({
        success: true,
        message:
          "Product activated successfully",
        product,
      });
    } catch (error) {
      console.error(
        "Activate product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to activate product",
      });
    }
  };

export {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deactivateProduct,
  activateProduct,
};