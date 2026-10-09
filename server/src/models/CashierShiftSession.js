import mongoose from "mongoose";

const cashierShiftSessionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN", index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  openingFloat: { type: Number, min: 0, default: 0 },
  closedAt: { type: Date, default: null },
  declaredCash: { type: Number, min: 0, default: null },
  expectedCash: { type: Number, min: 0, default: null },
  variance: { type: Number, default: null },
  cashSales: { type: Number, min: 0, default: 0 },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
  closingNotes: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true });

cashierShiftSessionSchema.index(
  { businessId: 1, branchId: 1, cashierId: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } }
);
cashierShiftSessionSchema.index({ businessId: 1, branchId: 1, startedAt: -1 });

export default mongoose.models.CashierShiftSession || mongoose.model("CashierShiftSession", cashierShiftSessionSchema);
