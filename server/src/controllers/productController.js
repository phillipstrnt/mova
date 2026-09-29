import mongoose from "mongoose";

import Product from "../models/Product.js";
import Category from "../models/Category.js";

const createProduct = async (req, res) => {
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

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    if (
      buyingPrice === undefined ||
      buyingPrice === null ||
      Number.isNaN(Number(buyingPrice))
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid buying price is required",
      });
    }

    if (
      sellingPrice === undefined ||
      sellingPrice === null ||
      Number.isNaN(Number(sellingPrice))
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid selling price is required",
      });
    }

    if (Number(buyingPrice) < 0 || Number(sellingPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "Prices cannot be negative",
      });
    }

    if (Number(sellingPrice) < Number(buyingPrice)) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price cannot be lower than buying price",
      });
    }

    if (Number(stockQuantity) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock quantity cannot be negative",
      });
    }

    if (Number(minimumStock) < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum stock cannot be negative",
      });
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const category = await Category.findOne({
        _id: categoryId,
        businessId: req.user.businessId,
        isActive: true,
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Selected category was not found",
        });
      }
    }

    const normalizedSku = sku.trim().toUpperCase();

    const existingSku = await Product.findOne({
      businessId: req.user.businessId,
      sku: normalizedSku,
    });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists",
      });
    }

    if (barcode.trim()) {
      const existingBarcode = await Product.findOne({
        businessId: req.user.businessId,
        barcode: barcode.trim(),
      });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: "A product with this barcode already exists",
        });
      }
    }

    const product = await Product.create({
      businessId: req.user.businessId,
      categoryId: categoryId || null,
      name: name.trim(),
      sku: normalizedSku,
      barcode: barcode.trim(),
      description: description.trim(),
      buyingPrice: Number(buyingPrice),
      sellingPrice: Number(sellingPrice),
      stockQuantity: Number(stockQuantity),
      minimumStock: Number(minimumStock),
      image: image.trim(),
      unit: unit.trim() || "piece",
      trackStock: Boolean(trackStock),
    });

    const populatedProduct = await Product.findById(product._id)
      .populate("categoryId", "name");

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populatedProduct,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      categoryId,
      status = "active",
      lowStock,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      businessId: req.user.businessId,
    };

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
      ];
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      filter.categoryId = categoryId;
    }

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    if (lowStock === "true") {
      filter.$expr = {
        $lte: ["$stockQuantity", "$minimumStock"],
      };
    }

    const currentPage = Math.max(Number(page) || 1, 1);

    const pageSize = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip = (currentPage - 1) * pageSize;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    }).populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
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

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }

      product.name = name.trim();
    }

    if (sku !== undefined) {
      const normalizedSku = sku.trim().toUpperCase();

      if (!normalizedSku) {
        return res.status(400).json({
          success: false,
          message: "SKU cannot be empty",
        });
      }

      const duplicate = await Product.findOne({
        businessId: req.user.businessId,
        sku: normalizedSku,
        _id: { $ne: product._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A product with this SKU already exists",
        });
      }

      product.sku = normalizedSku;
    }

    if (barcode !== undefined) {
      const trimmedBarcode = barcode.trim();

      if (trimmedBarcode) {
        const duplicate = await Product.findOne({
          businessId: req.user.businessId,
          barcode: trimmedBarcode,
          _id: { $ne: product._id },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "A product with this barcode already exists",
          });
        }
      }

      product.barcode = trimmedBarcode;
    }

    if (description !== undefined) {
      product.description = description.trim();
    }

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        product.categoryId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }

        const category = await Category.findOne({
          _id: categoryId,
          businessId: req.user.businessId,
          isActive: true,
        });

        if (!category) {
          return res.status(400).json({
            success: false,
            message: "Selected category was not found",
          });
        }

        product.categoryId = categoryId;
      }
    }

    if (buyingPrice !== undefined) {
      if (Number(buyingPrice) < 0) {
        return res.status(400).json({
          success: false,
          message: "Buying price cannot be negative",
        });
      }

      product.buyingPrice = Number(buyingPrice);
    }

    if (sellingPrice !== undefined) {
      if (Number(sellingPrice) < 0) {
        return res.status(400).json({
          success: false,
          message: "Selling price cannot be negative",
        });
      }

      product.sellingPrice = Number(sellingPrice);
    }

    if (product.sellingPrice < product.buyingPrice) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price cannot be lower than buying price",
      });
    }

    if (stockQuantity !== undefined) {
      if (Number(stockQuantity) < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock quantity cannot be negative",
        });
      }

      product.stockQuantity = Number(stockQuantity);
    }

    if (minimumStock !== undefined) {
      if (Number(minimumStock) < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum stock cannot be negative",
        });
      }

      product.minimumStock = Number(minimumStock);
    }

    if (image !== undefined) {
      product.image = image.trim();
    }

    if (unit !== undefined) {
      product.unit = unit.trim() || "piece";
    }

    if (trackStock !== undefined) {
      product.trackStock = Boolean(trackStock);
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate("categoryId", "name");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: populatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

const deactivateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = false;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      product,
    });
  } catch (error) {
    console.error("Deactivate product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
    });
  }
};

const activateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = true;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product activated successfully",
      product,
    });
  } catch (error) {
    console.error("Activate product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to activate product",
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