import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    reportType: {
      type: String,
      enum: [
        "BUSINESS",
        "SALES",
        "PAYMENTS",
        "EXPENSES",
        "PROFIT",
        "INVENTORY",
      ],
      default: "BUSINESS",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({
  businessId: 1,
  createdAt: -1,
});

const Report = mongoose.model(
  "Report",
  reportSchema
);

export default Report;