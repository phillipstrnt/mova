import mongoose from "mongoose";

const productBranchStockSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true,
      },

      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
      },

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
|--------------------------------------------------------------------------
| ONE STOCK RECORD PER PRODUCT PER BRANCH
|--------------------------------------------------------------------------
*/

productBranchStockSchema.index(
  {
    businessId: 1,
    branchId: 1,
    productId: 1,
  },
  {
    unique: true,
  }
);

/*
|--------------------------------------------------------------------------
| BRANCH INVENTORY LOOKUPS
|--------------------------------------------------------------------------
*/

productBranchStockSchema.index({
  businessId: 1,
  branchId: 1,
  stockQuantity: 1,
});

productBranchStockSchema.index({
  businessId: 1,
  branchId: 1,
  productId: 1,
  isActive: 1,
});

const ProductBranchStock =
  mongoose.model(
    "ProductBranchStock",
    productBranchStockSchema
  );

export default ProductBranchStock;