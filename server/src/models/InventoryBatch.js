import mongoose from "mongoose";

const inventoryBatchSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", default: null, index: true },
  batchCode: { type: String, trim: true, default: "" },
  quantityReceived: { type: Number, required: true, min: 1 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, min: 0, default: 0 },
  receivedAt: { type: Date, default: Date.now, index: true },
  expiryDate: { type: Date, default: null, index: true },
  status: { type: String, enum: ["ACTIVE", "DEPLETED", "CANCELLED"], default: "ACTIVE", index: true },
}, { timestamps: true });

inventoryBatchSchema.index({ businessId: 1, branchId: 1, productId: 1, receivedAt: 1 });
inventoryBatchSchema.index({ businessId: 1, branchId: 1, expiryDate: 1, remainingQuantity: 1 });

export default mongoose.models.InventoryBatch || mongoose.model("InventoryBatch", inventoryBatchSchema);
