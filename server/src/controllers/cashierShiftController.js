import mongoose from "mongoose";

import Branch from "../models/Branch.js";
import CashierShiftSchedule from "../models/CashierShiftSchedule.js";
import User from "../models/User.js";

const normalizeId = (value) => {
  const id = value?._id || value?.id || value;
  return id ? String(id).trim() : "";
};

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(String(value || ""));

const getRole = (req) => String(req.user?.role || "").trim().toUpperCase();

const getAuthorizedBranchIds = (req) => [
  ...(Array.isArray(req.user?.authorizedBranchIds) ? req.user.authorizedBranchIds : []),
  ...(Array.isArray(req.user?.branchIds) ? req.user.branchIds : []),
  req.user?.branchId,
  req.user?.activeBranchId,
]
  .map(normalizeId)
  .filter(Boolean);

const getBranchForRequest = async (req, requestedBranchId) => {
  const businessId = normalizeId(req.user?.businessId);
  const branchId = normalizeId(
    requestedBranchId || req.user?.activeBranchId || req.user?.branchId
  );

  if (!businessId || !isValidObjectId(businessId)) {
    const error = new Error("Your business information is missing.");
    error.statusCode = 400;
    throw error;
  }

  if (!branchId || !isValidObjectId(branchId)) {
    const error = new Error("Select an active branch to view or assign shifts.");
    error.statusCode = 400;
    throw error;
  }

  const role = getRole(req);
  if (
    role !== "OWNER" &&
    role !== "ADMIN" &&
    !getAuthorizedBranchIds(req).includes(branchId)
  ) {
    const error = new Error("You are not authorized to manage shifts for this branch.");
    error.statusCode = 403;
    throw error;
  }

  const branch = await Branch.findOne({
    _id: branchId,
    businessId,
    isActive: true,
  }).select("_id name");

  if (!branch) {
    const error = new Error("Branch not found or inactive.");
    error.statusCode = 404;
    throw error;
  }

  return branch;
};

const parseWeekStart = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error("Choose a valid week.");
    error.statusCode = 400;
    throw error;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    const error = new Error("Choose a valid week.");
    error.statusCode = 400;
    throw error;
  }

  const dayOfWeek = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - dayOfWeek + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const sendError = (res, error, fallback) => {
  console.error(fallback, error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
  });
};

export const getCashierShiftSchedules = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const branch = await getBranchForRequest(req, req.query.branchId);
    const weekStart = parseWeekStart(req.query.weekStart);
    const role = getRole(req);

    if (role === "CASHIER") {
      const schedule = await CashierShiftSchedule.findOne({
        businessId,
        branchId: branch._id,
        cashierId: req.user._id,
        weekStart,
      }).lean();

      return res.json({
        success: true,
        branch: { _id: branch._id, name: branch.name },
        weekStart,
        schedule,
      });
    }

    const cashiers = await User.find({
      businessId,
      role: "CASHIER",
      status: "ACTIVE",
      $or: [
        { branchIds: branch._id },
        { branchId: branch._id },
      ],
    })
      .select("name email phone")
      .sort({ name: 1 })
      .lean();

    const schedules = await CashierShiftSchedule.find({
      businessId,
      branchId: branch._id,
      weekStart,
      cashierId: { $in: cashiers.map((cashier) => cashier._id) },
    })
      .populate("cashierId", "name email phone")
      .lean();

    return res.json({
      success: true,
      branch: { _id: branch._id, name: branch.name },
      weekStart,
      cashiers,
      schedules,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load cashier shifts.");
  }
};

export const assignCashierShiftSchedule = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const branch = await getBranchForRequest(req, req.body.branchId);
    const weekStart = parseWeekStart(req.body.weekStart);
    const cashierId = normalizeId(req.body.cashierId);

    if (!isValidObjectId(cashierId)) {
      return res.status(400).json({ success: false, message: "Choose a cashier." });
    }

    const cashier = await User.findOne({
      _id: cashierId,
      businessId,
      role: "CASHIER",
      status: "ACTIVE",
      $or: [
        { branchIds: branch._id },
        { branchId: branch._id },
      ],
    }).select("_id name");

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "This cashier is not active or is not assigned to the selected branch.",
      });
    }

    if (!Array.isArray(req.body.days) || req.body.days.length !== 7) {
      return res.status(400).json({ success: false, message: "Add a shift or a day off for each day of the week." });
    }

    const days = req.body.days.map((day) => ({
      dayOfWeek: Number(day.dayOfWeek),
      isDayOff: Boolean(day.isDayOff),
      startTime: String(day.startTime || "").trim(),
      endTime: String(day.endTime || "").trim(),
    }));

    const uniqueDays = new Set(days.map((day) => day.dayOfWeek));
    if (
      uniqueDays.size !== 7 ||
      days.some((day) => !Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6)
    ) {
      return res.status(400).json({ success: false, message: "The weekly schedule must include each day exactly once." });
    }

    const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    for (const day of days) {
      if (day.isDayOff) {
        day.startTime = "";
        day.endTime = "";
        continue;
      }

      if (!validTime(day.startTime) || !validTime(day.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Set a valid start and end time, or mark the day as off.",
        });
      }
    }

    const schedule = await CashierShiftSchedule.findOneAndUpdate(
      { businessId, branchId: branch._id, cashierId: cashier._id, weekStart },
      {
        $set: { days, assignedBy: req.user._id },
        $setOnInsert: { businessId, branchId: branch._id, cashierId: cashier._id, weekStart },
      },
      { new: true, upsert: true, runValidators: true }
    )
      .populate("cashierId", "name email phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Weekly shifts saved for ${cashier.name}.`,
      schedule,
    });
  } catch (error) {
    return sendError(res, error, "Unable to save the weekly shift schedule.");
  }
};
