import mongoose from "mongoose";
import Branch from "../models/Branch.js";
import CashierShiftSession from "../models/CashierShiftSession.js";
import Payment from "../models/Payment.js";
import AuditLog from "../models/AuditLog.js";

const roleOf = (req) => String(req.user?.role || "").toUpperCase();
const idOf = (value) => String(value?._id || value?.id || value || "");

const resolveBranch = async (req, requestedId) => {
  const businessId = idOf(req.user?.businessId);
  const branchId = idOf(requestedId || req.user?.activeBranchId || req.user?.branchId);
  if (!mongoose.Types.ObjectId.isValid(businessId) || !mongoose.Types.ObjectId.isValid(branchId)) {
    const error = new Error("Select an active branch before starting a cash drawer shift.");
    error.statusCode = 400;
    throw error;
  }
  const allowed = [req.user?.activeBranchId, req.user?.branchId, ...(req.user?.branchIds || []), ...(req.user?.authorizedBranchIds || [])].map(idOf);
  if (!["OWNER", "ADMIN"].includes(roleOf(req)) && !allowed.includes(branchId)) {
    const error = new Error("You are not assigned to this branch.");
    error.statusCode = 403;
    throw error;
  }
  const branch = await Branch.findOne({ _id: branchId, businessId, isActive: true }).select("_id name");
  if (!branch) {
    const error = new Error("Branch not found or inactive.");
    error.statusCode = 404;
    throw error;
  }
  return branch;
};

const audit = async (req, branchId, action, description, metadata = {}) => {
  await AuditLog.create({
    businessId: req.user.businessId,
    branchId,
    actorId: req.user._id,
    actorName: req.user.name || "",
    actorRole: roleOf(req),
    action,
    entity: "CASHIER_SHIFT",
    description,
    severity: action === "SHIFT_CLOSED" && Math.abs(Number(metadata.variance || 0)) > 0 ? "WARNING" : "INFO",
    metadata,
    ipAddress: req.ip || "",
    userAgent: String(req.get("user-agent") || "").slice(0, 500),
  });
};

export const getCurrentCashierShift = async (req, res) => {
  try {
    const branch = await resolveBranch(req, req.query.branchId);
    const shift = await CashierShiftSession.findOne({
      businessId: req.user.businessId,
      branchId: branch._id,
      cashierId: req.user._id,
      status: "OPEN",
    }).lean();
    return res.json({ success: true, branch, shift });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to load the current shift." });
  }
};

export const startCashierShift = async (req, res) => {
  try {
    const branch = await resolveBranch(req, req.body.branchId);
    const openingFloat = Number(req.body.openingFloat || 0);
    if (!Number.isFinite(openingFloat) || openingFloat < 0) {
      return res.status(400).json({ success: false, message: "Opening cash float must be zero or more." });
    }
    const existing = await CashierShiftSession.findOne({ businessId: req.user.businessId, branchId: branch._id, cashierId: req.user._id, status: "OPEN" });
    if (existing) return res.status(409).json({ success: false, message: "Your cash drawer shift is already open.", shift: existing });
    const shift = await CashierShiftSession.create({
      businessId: req.user.businessId,
      branchId: branch._id,
      cashierId: req.user._id,
      openingFloat,
      notes: String(req.body.notes || "").trim().slice(0, 500),
    });
    await audit(req, branch._id, "SHIFT_STARTED", `Cashier started a shift with ${openingFloat} opening cash.`, { openingFloat, shiftId: shift._id });
    return res.status(201).json({ success: true, message: "Cash drawer shift started.", shift });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "A cash drawer shift is already open for this cashier and branch." });
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to start the shift." });
  }
};

export const closeCashierShift = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id || ""))) return res.status(400).json({ success: false, message: "Invalid shift ID." });
    const shift = await CashierShiftSession.findOne({ _id: req.params.id, businessId: req.user.businessId, cashierId: req.user._id, status: "OPEN" });
    if (!shift) return res.status(404).json({ success: false, message: "Open shift not found." });
    const declaredCash = Number(req.body.declaredCash);
    if (!Number.isFinite(declaredCash) || declaredCash < 0) return res.status(400).json({ success: false, message: "Enter the physical cash counted in the drawer." });
    const totals = await Payment.aggregate([
      { $match: { businessId: shift.businessId, branchId: shift.branchId, receivedBy: shift.cashierId, paymentMethod: "CASH", paymentDate: { $gte: shift.startedAt, $lte: new Date() } } },
      { $group: { _id: null, cashSales: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$amount", 0] } }, refunds: { $sum: { $cond: [{ $eq: ["$status", "REFUNDED"] }, "$amount", 0] } } } },
    ]);
    const cashSales = Math.max(0, Number(totals[0]?.cashSales || 0) - Number(totals[0]?.refunds || 0));
    const expectedCash = Number(shift.openingFloat || 0) + cashSales;
    shift.cashSales = cashSales;
    shift.expectedCash = expectedCash;
    shift.declaredCash = declaredCash;
    shift.variance = declaredCash - expectedCash;
    shift.closingNotes = String(req.body.notes || "").trim().slice(0, 500);
    shift.status = "CLOSED";
    shift.closedAt = new Date();
    await shift.save();
    await audit(req, shift.branchId, "SHIFT_CLOSED", `Cashier closed a shift. Cash variance: ${shift.variance}.`, { shiftId: shift._id, openingFloat: shift.openingFloat, cashSales, expectedCash, declaredCash, variance: shift.variance });
    return res.json({ success: true, message: "Shift closed and cash reconciled.", shift });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to close the shift." });
  }
};
