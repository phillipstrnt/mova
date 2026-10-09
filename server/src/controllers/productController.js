import mongoose from "mongoose";

import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Category from "../models/Category.js";
import Branch from "../models/Branch.js";
import { hasPermission } from "../config/permissions.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/*
 * Resolve the branch currently selected by the authenticated user.
 *
 * We never trust a branchId sent directly from the frontend.
 */
const resolveActiveBranch = async (req) => {
  const businessId =
    req.user.businessId;

  const activeBranchId =
    req.user.activeBranchId ||
    req.user.branchId;

  if (!activeBranchId) {
    return null;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      activeBranchId
    )
  ) {
    return null;
  }

  const branch =
    await Branch.findOne({
      _id: activeBranchId,
      businessId,
      isActive: true,
    });

  if (!branch) {
    return null;
  }

  /*
   * OWNER and ADMIN can work across
   * business branches.
   */
  if (
    req.user.role === "OWNER" ||
    req.user.role === "ADMIN"
  ) {
    return branch;
  }

  /*
   * Other users must explicitly have
   * the branch assigned to them.
   */
  const assignedBranches =
    Array.isArray(
      req.user.branchIds
    )
      ? req.user.branchIds.map(
          (id) => String(id)
        )
      : [];

  if (
    !assignedBranches.includes(
      String(branch._id)
    )
  ) {
    return null;
  }

  return branch;
};

/*
|--------------------------------------------------------------------------
| GET / CREATE BRANCH STOCK
|--------------------------------------------------------------------------
|
| Older products may not yet have a ProductBranchStock record.
|
| We don't duplicate legacy stock across multiple branches.
|
*/

const getOrCreateBranchStock = async ({
  businessId,
  branchId,
  product,
}) => {
  let branchStock =
    await ProductBranchStock.findOne({
      businessId,
      branchId,
      productId: product._id,
      isActive: true,
    });

  if (branchStock) {
    return branchStock;
  }

  /*
   * Check how many active branches exist.
   */
  const activeBranchCount =
    await Branch.countDocuments({
      businessId,
      isActive: true,
    });

  /*
   * If this is a single-branch business,
   * legacy product stock can safely become
   * the branch stock.
   */
  const initialStock =
    activeBranchCount === 1
      ? Number(
          product.stockQuantity || 0
        )
      : 0;

  const initialMinimumStock =
    Number(
      product.minimumStock || 0
    );

  try {
    branchStock =
      await ProductBranchStock.create(
        {
          businessId,

          branchId,

          productId:
            product._id,

          stockQuantity:
            initialStock,

          minimumStock:
            initialMinimumStock,

          isActive: true,
        }
      );

    return branchStock;
  } catch (error) {
    /*
     * Another request may have created
     * the record at the same time.
     *
     * Try reading it again.
     */
    if (
      error.code === 11000
    ) {
      branchStock =
        await ProductBranchStock.findOne(
          {
            businessId,
            branchId,
            productId:
              product._id,
            isActive: true,
          }
        );

      if (branchStock) {
        return branchStock;
      }
    }

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| ENRICH PRODUCTS WITH BRANCH STOCK
|--------------------------------------------------------------------------
*/

const attachBranchStock = async (
  products,
  branch
) => {
  if (
    !branch ||
    !products.length
  ) {
    return products.map(
      (product) => ({
        ...product.toObject(),
        branchStockQuantity:
          null,
        branchMinimumStock:
          null,
        stockSource:
          "BUSINESS",
      })
    );
  }

  const productIds =
    products.map(
      (product) =>
        product._id
    );

  const branchStocks =
    await ProductBranchStock.find({
      businessId:
        branch.businessId,

      branchId:
        branch._id,

      productId: {
        $in: productIds,
      },

      isActive: true,
    }).lean();

  const stockMap =
    new Map();

  for (
    const stock of branchStocks
  ) {
    stockMap.set(
      String(stock.productId),
      stock
    );
  }

  return products.map(
    (product) => {
      const plainProduct =
        product.toObject();

      const branchStock =
        stockMap.get(
          String(product._id)
        );

      if (branchStock) {
        return {
          ...plainProduct,

          /*
           * Keep stockQuantity for
           * frontend compatibility.
           *
           * It now represents the
           * CURRENT BRANCH stock.
           */
          stockQuantity:
            branchStock.stockQuantity,

          minimumStock:
            branchStock.minimumStock,

          branchStockQuantity:
            branchStock.stockQuantity,

          branchMinimumStock:
            branchStock.minimumStock,

          branchId:
            branch._id,

          stockSource:
            "BRANCH",
        };
      }

      /*
       * No branch record yet.
       */
      return {
        ...plainProduct,

        branchStockQuantity:
          0,

        branchMinimumStock:
          plainProduct.minimumStock ||
          0,

        stockQuantity: 0,

        minimumStock:
          plainProduct.minimumStock ||
          0,

        branchId:
          branch._id,

        stockSource:
          "BRANCH",
      };
    }
  );
};

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
*/

export const createProduct =
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        sku,
        barcode = "",
        description = "",
        buyingPrice,
        sellingPrice,
        stockQuantity = 0,
        minimumStock = 0,
        image = "",
        unit = "piece",
        trackStock = true,
        categoryId = null,
      } = req.body;

      const businessId =
        req.user.businessId;

      /*
       * Basic validation.
       */
      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product name is required.",
        });
      }

      if (
        !sku ||
        !String(sku).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product SKU is required.",
        });
      }

      const numericBuyingPrice =
        Number(
          buyingPrice
        );

      const numericSellingPrice =
        Number(
          sellingPrice
        );

      const numericStock =
        Number(
          stockQuantity
        );

      const numericMinimumStock =
        Number(
          minimumStock
        );

      if (
        !Number.isFinite(
          numericBuyingPrice
        ) ||
        numericBuyingPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Buying price must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(
          numericSellingPrice
        ) ||
        numericSellingPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selling price must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(
          numericStock
        ) ||
        numericStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock quantity must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(
          numericMinimumStock
        ) ||
        numericMinimumStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum stock must be a valid non-negative number.",
        });
      }

      /*
       * Validate category.
       */
      let category = null;

      if (categoryId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            categoryId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid category ID.",
          });
        }

        category =
          await Category.findOne({
            _id: categoryId,
            businessId,
          });

        if (!category) {
          return res.status(404).json({
            success: false,
            message:
              "Category not found.",
          });
        }
      }

      /*
       * Check SKU.
       */
      const existingSku =
        await Product.findOne({
          businessId,

          sku: String(sku)
            .trim()
            .toUpperCase(),
        });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message:
            "A product with this SKU already exists.",
        });
      }

      /*
       * Check barcode if provided.
       */
      const normalizedBarcode =
        String(barcode || "").trim();

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
              "A product with this barcode already exists.",
          });
        }
      }

      /*
       * Create product master.
       *
       * The legacy stock fields remain temporarily
       * for compatibility with existing modules.
       */
      const product =
        await Product.create({
          businessId,

          categoryId:
            category
              ? category._id
              : null,

          name:
            String(name).trim(),

          sku:
            String(sku)
              .trim()
              .toUpperCase(),

          barcode:
            normalizedBarcode,

          description:
            String(
              description || ""
            ).trim(),

          buyingPrice:
            numericBuyingPrice,

          sellingPrice:
            numericSellingPrice,

          stockQuantity:
            numericStock,

          minimumStock:
            numericMinimumStock,

          image:
            String(image || ""),

          unit:
            String(
              unit || "piece"
            ).trim(),

          trackStock:
            Boolean(trackStock),

          isActive: true,
        });

      /*
       * Resolve current branch.
       */
      const branch =
        await resolveActiveBranch(req);

      /*
       * Create branch stock record.
       */
      if (branch) {
        await ProductBranchStock.create(
          {
            businessId,

            branchId:
              branch._id,

            productId:
              product._id,

            stockQuantity:
              numericStock,

            minimumStock:
              numericMinimumStock,

            isActive: true,
          }
        );
      }

      /*
       * Return enriched product.
       */
      let result = product;

      if (branch) {
        const enriched =
          await attachBranchStock(
            [product],
            branch
          );

        result =
          enriched[0];
      }

      return res.status(201).json({
        success: true,

        message:
          "Product created successfully.",

        product: result,
      });
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A product with the same SKU or barcode already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to create product.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET PRODUCTS
|--------------------------------------------------------------------------
*/

export const getProducts =
  async (
    req,
    res
  ) => {
    try {
      const {
        search = "",
        categoryId,
        status,
        lowStock,
        page = 1,
        limit = 20,
      } = req.query;

      const businessId =
        req.user.businessId;
      const canViewCosts = hasPermission(req.user?.role, "products.view");

      /*
       * Resolve active branch.
       */
      const branch =
        await resolveActiveBranch(req);

      /*
       * Base filter.
       */
      const filter = {
        businessId,
      };

      // POS users may see active sellable products, but not cost or inactive items.
      if (!canViewCosts) {
        filter.isActive = true;
      }

      /*
       * Search.
       */
      if (
        typeof search === "string" &&
        search.trim()
      ) {
        const searchRegex = {
          $regex:
            search.trim(),
          $options:
            "i",
        };

        filter.$or = [
          {
            name:
              searchRegex,
          },
          {
            sku:
              searchRegex,
          },
          {
            barcode:
              searchRegex,
          },
        ];
      }

      /*
       * Category.
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
              "Invalid category ID.",
          });
        }

        filter.categoryId =
          categoryId;
      }

      /*
       * Status.
       */
      if (
        status === "ACTIVE"
      ) {
        filter.isActive = true;
      }

      if (
        status === "INACTIVE"
      ) {
        filter.isActive = false;
      }

      /*
       * Fetch products.
       *
       * We fetch before pagination when
       * branch-level low-stock filtering
       * is required.
       */
      const requiresBranchFiltering =
        Boolean(
          branch &&
            (
              lowStock === "true" ||
              lowStock === "1"
            )
        );

      let products;
      let total;

      if (
        requiresBranchFiltering
      ) {
        /*
         * Get all matching products.
         */
        const allProducts =
          await Product.find(
            filter
          )
            .populate(
              "categoryId",
              "name"
            )
            .sort({
              createdAt:
                -1,
            });

        const enrichedProducts =
          await attachBranchStock(
            allProducts,
            branch
          );

        const lowStockProducts =
          enrichedProducts.filter(
            (product) =>
              product.trackStock &&
              Number(
                product.stockQuantity
              ) <=
                Number(
                  product.minimumStock
                )
          );

        total =
          lowStockProducts.length;

        const parsedPage =
          Number(page);

        const parsedLimit =
          Number(limit);

        const pageNumber =
          Number.isFinite(
            parsedPage
          )
            ? Math.max(
                parsedPage,
                1
              )
            : 1;

        const limitNumber =
          Number.isFinite(
            parsedLimit
          )
            ? Math.min(
                Math.max(
                  parsedLimit,
                  1
                ),
                100
              )
            : 20;

        const skip =
          (pageNumber - 1) *
          limitNumber;

        products =
          lowStockProducts.slice(
            skip,
            skip +
              limitNumber
          );

        const responseProducts = canViewCosts ? products : products.map((product) => {
          const safeProduct = typeof product?.toObject === "function" ? product.toObject() : { ...product };
          delete safeProduct.buyingPrice;
          return safeProduct;
        });

        return res.json({
          success: true,

          products: responseProducts,

          branch: {
            id:
              branch._id,

            name:
              branch.name,

            code:
              branch.code,
          },

          pagination: {
            page:
              pageNumber,

            limit:
              limitNumber,

            total,

            pages:
              Math.ceil(
                total /
                  limitNumber
              ),
          },
        });
      }

      /*
       * Normal product query.
       */
      const parsedPage =
        Number(page);

      const parsedLimit =
        Number(limit);

      const pageNumber =
        Number.isFinite(
          parsedPage
        )
          ? Math.max(
              parsedPage,
              1
            )
          : 1;

      const limitNumber =
        Number.isFinite(
          parsedLimit
        )
          ? Math.min(
              Math.max(
                parsedLimit,
                1
              ),
              100
            )
          : 20;

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const [
        rawProducts,
        rawTotal,
      ] =
        await Promise.all([
          Product.find(filter)
            .populate(
              "categoryId",
              "name"
            )
            .sort({
              createdAt:
                -1,
            })
            .skip(skip)
            .limit(
              limitNumber
            ),

          Product.countDocuments(
            filter
          ),
        ]);

      products =
        await attachBranchStock(
          rawProducts,
          branch
        );

      total =
        rawTotal;

      const responseProducts = canViewCosts ? products : products.map((product) => {
        const safeProduct = typeof product?.toObject === "function" ? product.toObject() : { ...product };
        delete safeProduct.buyingPrice;
        return safeProduct;
      });

      return res.json({
        success: true,

        products: responseProducts,

        branch: branch
          ? {
              id:
                branch._id,

              name:
                branch.name,

              code:
                branch.code,
            }
          : null,

        pagination: {
          page:
            pageNumber,

          limit:
            limitNumber,

          total,

          pages:
            Math.ceil(
              total /
                limitNumber
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
          "Failed to fetch products.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET PRODUCT BY ID
|--------------------------------------------------------------------------
*/

export const getProductById =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      const product =
        await Product.findOne({
          _id: id,

          businessId:
            req.user.businessId,
        }).populate(
          "categoryId",
          "name"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const branch =
        await resolveActiveBranch(req);

      let result =
        product.toObject();

      if (branch) {
        const enriched =
          await attachBranchStock(
            [product],
            branch
          );

        result =
          enriched[0];
      }

      return res.json({
        success: true,

        product: result,

        branch: branch
          ? {
              id:
                branch._id,

              name:
                branch.name,

              code:
                branch.code,
            }
          : null,
      });
    } catch (error) {
      console.error(
        "Get product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch product.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|--------------------------------------------------------------------------
*/

export const updateProduct =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      const businessId =
        req.user.businessId;

      const product =
        await Product.findOne({
          _id: id,
          businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const {
        name,
        sku,
        barcode,
        description,
        buyingPrice,
        sellingPrice,
        stockQuantity,
        minimumStock,
        image,
        unit,
        trackStock,
        categoryId,
      } = req.body;

      /*
       * Category validation.
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
              "Invalid category ID.",
          });
        }

        const category =
          await Category.findOne({
            _id: categoryId,
            businessId,
          });

        if (!category) {
          return res.status(404).json({
            success: false,
            message:
              "Category not found.",
          });
        }

        product.categoryId =
          category._id;
      }

      /*
       * SKU validation.
       */
      if (
        sku !== undefined
      ) {
        const normalizedSku =
          String(sku)
            .trim()
            .toUpperCase();

        if (!normalizedSku) {
          return res.status(400).json({
            success: false,
            message:
              "SKU cannot be empty.",
          });
        }

        const duplicate =
          await Product.findOne({
            _id: {
              $ne: product._id,
            },

            businessId,

            sku:
              normalizedSku,
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Another product with this SKU already exists.",
          });
        }

        product.sku =
          normalizedSku;
      }

      /*
       * Barcode validation.
       */
      if (
        barcode !== undefined
      ) {
        const normalizedBarcode =
          String(
            barcode || ""
          ).trim();

        if (
          normalizedBarcode
        ) {
          const duplicate =
            await Product.findOne({
              _id: {
                $ne:
                  product._id,
              },

              businessId,

              barcode:
                normalizedBarcode,
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "Another product with this barcode already exists.",
            });
          }
        }

        product.barcode =
          normalizedBarcode;
      }

      /*
       * Basic fields.
       */
      if (
        name !== undefined
      ) {
        if (
          !String(name).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Product name cannot be empty.",
          });
        }

        product.name =
          String(name).trim();
      }

      if (
        description !==
        undefined
      ) {
        product.description =
          String(
            description || ""
          ).trim();
      }

      if (
        buyingPrice !==
        undefined
      ) {
        const value =
          Number(
            buyingPrice
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Buying price must be a valid non-negative number.",
          });
        }

        product.buyingPrice =
          value;
      }

      if (
        sellingPrice !==
        undefined
      ) {
        const value =
          Number(
            sellingPrice
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selling price must be a valid non-negative number.",
          });
        }

        product.sellingPrice =
          value;
      }

      if (
        image !== undefined
      ) {
        product.image =
          String(image || "");
      }

      if (
        unit !== undefined
      ) {
        product.unit =
          String(
            unit || "piece"
          ).trim();
      }

      if (
        trackStock !==
        undefined
      ) {
        product.trackStock =
          Boolean(trackStock);
      }

      /*
       * Resolve branch.
       */
      const branch =
        await resolveActiveBranch(req);

      /*
       * Branch stock updates.
       *
       * We keep compatibility with the existing
       * product form, but actual branch stock is
       * now stored in ProductBranchStock.
       */
      if (
        branch &&
        (
          stockQuantity !==
            undefined ||
          minimumStock !==
            undefined
        )
      ) {
        const branchStock =
          await getOrCreateBranchStock({
            businessId,

            branchId:
              branch._id,

            product,
          });

        if (
          stockQuantity !==
          undefined
        ) {
          const value =
            Number(
              stockQuantity
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Stock quantity must be a valid non-negative number.",
            });
          }

          branchStock.stockQuantity =
            value;

          /*
           * Legacy compatibility.
           *
           * This is maintained only so
           * older modules don't suddenly
           * receive undefined data.
           */
          if (
            branch._id &&
            (
              await Branch.countDocuments({
                businessId,
                isActive: true,
              })
            ) === 1
          ) {
            product.stockQuantity =
              value;
          }
        }

        if (
          minimumStock !==
          undefined
        ) {
          const value =
            Number(
              minimumStock
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Minimum stock must be a valid non-negative number.",
            });
          }

          branchStock.minimumStock =
            value;

          if (
            (
              await Branch.countDocuments({
                businessId,
                isActive: true,
              })
            ) === 1
          ) {
            product.minimumStock =
              value;
          }
        }

        await branchStock.save();
      } else {
        /*
         * No active branch.
         *
         * Only update legacy fields.
         */
        if (
          stockQuantity !==
          undefined
        ) {
          const value =
            Number(
              stockQuantity
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Stock quantity must be a valid non-negative number.",
            });
          }

          product.stockQuantity =
            value;
        }

        if (
          minimumStock !==
          undefined
        ) {
          const value =
            Number(
              minimumStock
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Minimum stock must be a valid non-negative number.",
            });
          }

          product.minimumStock =
            value;
        }
      }

      await product.save();

      /*
       * Return branch-aware product.
       */
      let result =
        product.toObject();

      if (branch) {
        const enriched =
          await attachBranchStock(
            [product],
            branch
          );

        result =
          enriched[0];
      }

      return res.json({
        success: true,

        message:
          "Product updated successfully.",

        product: result,
      });
    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update product.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| DEACTIVATE PRODUCT
|--------------------------------------------------------------------------
*/

export const deactivateProduct =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      const product =
        await Product.findOneAndUpdate(
          {
            _id: id,

            businessId:
              req.user.businessId,
          },

          {
            isActive: false,
          },

          {
            new: true,
          }
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Product deactivated successfully.",

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
          "Failed to deactivate product.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| ACTIVATE PRODUCT
|--------------------------------------------------------------------------
*/

export const activateProduct =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      const product =
        await Product.findOneAndUpdate(
          {
            _id: id,

            businessId:
              req.user.businessId,
          },

          {
            isActive: true,
          },

          {
            new: true,
          }
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Product activated successfully.",

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
          "Failed to activate product.",
      });
    }
  };
