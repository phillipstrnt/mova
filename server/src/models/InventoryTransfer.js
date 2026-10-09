import mongoose from "mongoose";

const transferItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const inventoryTransferSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  sourceBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  destinationBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  items: { type: [transferItemSchema], required: true, validate: (items) => Array.isArray(items) && items.length > 0 },
  status: { type: String, enum: ["REQUESTED", "PROCESSING", "APPROVED", "REJECTED"], default: "REQUESTED", index: true },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
  reviewNotes: { type: String, trim: true, default: "", maxlength: 500 },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

inventoryTransferSchema.index({ businessId: 1, status: 1, createdAt: -1 });
export default mongoose.models.InventoryTransfer || mongoose.model("InventoryTransfer", inventoryTransferSchema);
