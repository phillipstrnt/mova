import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import CustomerCreditDebt from "../models/CustomerCreditDebt.js";
import Payment from "../models/Payment.js";
import Sale from "../models/Sale.js";
import AuditLog from "../models/AuditLog.js";

const roleOf = (req) => String(req.user?.role || "").toUpperCase();
const isAdmin = (req) => ["OWNER", "ADMIN"].includes(roleOf(req));
const branchIds = (req) => [req.user?.branchId, req.user?.activeBranchId, ...(req.user?.branchIds || []), ...(req.user?.authorizedBranchIds || [])].map((value) => String(value?._id || value?.id || value || ""));

const findCustomerForUser = async (req, customerId) => {
  if (!mongoose.Types.ObjectId.isValid(String(customerId || ""))) return null;
  const customer = await Customer.findOne({ _id: customerId, businessId: req.user.businessId });
  if (!customer || (!isAdmin(req) && !branchIds(req).includes(String(customer.branchId)))) return null;
  return customer;
};

export const getCustomerCreditHistory = async (req, res) => {
  try {
    const customer = await findCustomerForUser(req, req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found in your assigned branch." });
    const [debts, payments] = await Promise.all([
      CustomerCreditDebt.find({ businessId: req.user.businessId, customerId: customer._id }).populate("saleId", "receiptNumber total createdAt").sort({ createdAt: -1 }).lean(),
      Payment.find({ businessId: req.user.businessId, customerId: customer._id, notes: /store credit repayment/i }).populate("saleId", "receiptNumber").sort({ paymentDate: -1 }).lean(),
    ]);
    return res.json({ success: true, customer: { _id: customer._id, creditLimit: customer.creditLimit, outstandingBalance: customer.outstandingBalance }, debts, payments });
  } catch (error) {
    console.error("Get customer credit history error:", error);
    return res.status(500).json({ success: false, message: "Unable to load the customer credit ledger." });
  }
};

export const recordCustomerCreditPayment = async (req, res) => {
  const allocations = [];
  try {
    const customer = await findCustomerForUser(req, req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found in your assigned branch." });
    const amount = Number(req.body.amount);
    const paymentMethod = String(req.body.paymentMethod || "CASH").toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "Enter a payment amount greater than zero." });
    if (!["CASH", "MOBILE_MONEY", "BANK", "CARD"].includes(paymentMethod)) return res.status(400).json({ success: false, message: "Choose cash, Mobile Money, card, or bank transfer." });
    if (amount > Number(customer.outstandingBalance || 0)) return res.status(400).json({ success: false, message: "Payment cannot exceed the customer's outstanding balance." });
    let remaining = amount;
    const debts = await CustomerCreditDebt.find({ businessId: customer.businessId, branchId: customer.branchId, customerId: customer._id, remainingBalance: { $gt: 0 } }).sort({ createdAt: 1 });
    for (const debt of debts) {
      if (remaining <= 0) break;
      const portion = Math.min(remaining, Number(debt.remainingBalance));
      const updatedDebt = await CustomerCreditDebt.findOneAndUpdate(
        { _id: debt._id, remainingBalance: { $gte: portion } },
        { $inc: { remainingBalance: -portion, paidAmount: portion }, $set: { status: debt.remainingBalance - portion <= 0 ? "PAID" : "PARTIALLY_PAID" } },
        { new: true }
      );
      if (!updatedDebt) throw new Error("The customer balance changed while recording this payment. Refresh and try again.");
      // Register the debt mutation before creating its Payment record. If Payment
      // creation fails, the catch block must still restore this allocation.
      const allocation = { debtId: debt._id, saleId: debt.saleId, amount: portion, paymentId: null };
      allocations.push(allocation);
      const payment = await Payment.create({
        businessId: customer.businessId,
        branchId: customer.branchId,
        saleId: debt.saleId,
        customerId: customer._id,
        receivedBy: req.user._id,
        amount: portion,
        paymentMethod,
        reference: String(req.body.reference || "").trim().slice(0, 120),
        notes: "Store credit repayment",
        status: "COMPLETED",
        paymentDate: new Date(),
      });
      allocation.paymentId = payment._id;
      if (updatedDebt.remainingBalance <= 0) await Sale.updateOne({ _id: debt.saleId, businessId: customer.businessId }, { $set: { paymentStatus: "PAID" } });
      remaining -= portion;
    }
    if (remaining > 0.01) throw new Error("The customer ledger does not match the current balance. Ask a manager to reconcile it.");
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customer._id, businessId: customer.businessId, outstandingBalance: { $gte: amount } },
      { $inc: { outstandingBalance: -amount } },
      { new: true }
    );
    if (!updatedCustomer) throw new Error("The customer balance changed while recording this payment. Refresh and try again.");
    await AuditLog.create({ businessId: customer.businessId, branchId: customer.branchId, actorId: req.user._id, actorName: req.user.name || "", actorRole: roleOf(req), action: "CUSTOMER_CREDIT_PAYMENT", entity: "CUSTOMER", entityId: customer._id, description: `Recorded ${paymentMethod} credit payment of ${amount} for ${customer.name}.`, severity: "INFO", metadata: { amount, paymentMethod, allocations: allocations.length } }).catch((auditError) => console.error("Unable to write credit payment audit log:", auditError));
    return res.status(201).json({ success: true, message: "Credit payment recorded and allocated to the oldest outstanding sale.", outstandingBalance: updatedCustomer.outstandingBalance, allocations });
  } catch (error) {
    console.error("Record customer credit payment error:", error);
    for (const allocation of allocations.reverse()) {
      if (allocation.paymentId) await Payment.deleteOne({ _id: allocation.paymentId });
      const debt = await CustomerCreditDebt.findById(allocation.debtId);
      if (debt) {
        debt.remainingBalance += allocation.amount;
        debt.paidAmount = Math.max(0, debt.paidAmount - allocation.amount);
        debt.status = debt.paidAmount > 0 ? "PARTIALLY_PAID" : "OPEN";
        await debt.save();
      }
      await Sale.updateOne({ _id: allocation.saleId }, { $set: { paymentStatus: "PENDING" } });
    }
    return res.status(error.statusCode || 400).json({ success: false, message: error.message || "Unable to record the credit payment." });
  }
};
