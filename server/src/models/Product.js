
import mongoose from "mongoose";

const productSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * BUSINESS
       * =====================================================
       */

      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      /*
       * =====================================================
       * PRODUCT INFORMATION
       * =====================================================
       */

      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      barcode: {
        type: String,
        trim: true,
        default: "",
      },

      description: {
        type: String,
        trim: true,
        default: "",
      },

      buyingPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      /*
       * =====================================================
       * LEGACY STOCK
       * =====================================================
       *
       * This field is temporarily retained so existing
       * MOVA functionality and old records do not break.
       *
       * New branch-aware stock operations should use:
       *
       * ProductBranchStock.stockQuantity
       *
       * rather than this field.
       */

      stockQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      minimumStock: {
        type: Number,
        default: 0,
        min: 0,
      },

      /*
       * =====================================================
       * PRODUCT PRESENTATION
       * =====================================================
       */

      image: {
        type: String,
        default: "",
      },

      unit: {
        type: String,
        default: "piece",
        trim: true,
      },

      /*
       * =====================================================
       * STOCK CONTROL
       * =====================================================
       */

      trackStock: {
        type: Boolean,
        default: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * =========================================================
 * BUSINESS + SKU
 * =========================================================
 */

productSchema.index(
  {
    businessId: 1,
    sku: 1,
  },
  {
    unique: true,
  }
);

/*
 * =========================================================
 * BUSINESS + BARCODE
 * =========================================================
 */

productSchema.index(
  {
    businessId: 1,
    barcode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      barcode: {
        $exists: true,
        $ne: "",
      },
    },
  }
);

/*
 * =========================================================
 * PRODUCT SEARCH
 * =========================================================
 */

productSchema.index({
  businessId: 1,
  name: 1,
});

const Product =
  mongoose.model(
    "Product",
    productSchema
  );

export default Product;