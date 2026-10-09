import mongoose from "mongoose";

const customerCreditDebtSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true, unique: true },
  originalAmount: { type: Number, min: 0, required: true },
  paidAmount: { type: Number, min: 0, default: 0 },
  remainingBalance: { type: Number, min: 0, required: true, index: true },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ["OPEN", "PARTIALLY_PAID", "PAID"], default: "OPEN", index: true },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true });

customerCreditDebtSchema.index({ businessId: 1, branchId: 1, customerId: 1, createdAt: -1 });
export default mongoose.models.CustomerCreditDebt || mongoose.model("CustomerCreditDebt", customerCreditDebtSchema);
