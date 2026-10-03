
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";
import ReceiptSettings from "../models/ReceiptSettings.js";

const getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findById(
      req.user.businessId
    );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      business,
    });
  } catch (error) {
    console.error(
      "Get business profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load business profile",
    });
  }
};

const updateBusinessProfile = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const {
      name,
      businessType,
      phone,
      email,
      address,
      country,
      currency,
      timezone,
      logo,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    if (!businessType || !businessType.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business type is required",
      });
    }

    const updateData = {
      name: name.trim(),
      businessType: businessType.trim(),
      phone: phone?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      address: address?.trim() || "",
      country: country?.trim() || "Uganda",
      currency: currency?.trim() || "UGX",
      timezone:
        timezone?.trim() || "Africa/Kampala",
    };

    if (typeof logo === "string") {
      updateData.logo = logo.trim();
    }

    const business =
      await Business.findByIdAndUpdate(
        businessId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Business profile updated successfully",
      business,
    });
  } catch (error) {
    console.error(
      "Update business profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update business profile",
      error: error.message,
    });
  }
};

const getSetupStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const [
      business,
      branchCount,
      receiptSettings,
    ] = await Promise.all([
      Business.findById(businessId).select(
        "_id name businessType phone email address country currency timezone logo"
      ),

      Branch.countDocuments({
        businessId,
        isActive: true,
      }),

      ReceiptSettings.findOne({
        businessId,
      }).select("_id"),
    ]);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const businessComplete =
      Boolean(business.name) &&
      Boolean(business.businessType);

    const branchComplete =
      branchCount > 0;

    const receiptComplete =
      Boolean(receiptSettings);

    const setupComplete =
      businessComplete &&
      branchComplete &&
      receiptComplete;

    return res.status(200).json({
      success: true,
      setupComplete,

      steps: {
        business: businessComplete,
        branch: branchComplete,
        receipt: receiptComplete,
      },

      business,
    });
  } catch (error) {
    console.error(
      "Get setup status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to determine setup status",
      error: error.message,
    });
  }
};

export {
  getBusinessProfile,
  updateBusinessProfile,
  getSetupStatus,
};