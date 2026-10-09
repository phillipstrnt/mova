import mongoose from "mongoose";

const shiftDaySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    isDayOff: {
      type: Boolean,
      default: true,
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const cashierShiftScheduleSchema = new mongoose.Schema(
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
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    days: {
      type: [shiftDaySchema],
      default: [],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

cashierShiftScheduleSchema.index(
  { businessId: 1, branchId: 1, cashierId: 1, weekStart: 1 },
  { unique: true }
);

const CashierShiftSchedule =
  mongoose.models.CashierShiftSchedule ||
  mongoose.model("CashierShiftSchedule", cashierShiftScheduleSchema);

export default CashierShiftSchedule;
