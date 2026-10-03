
import Business from "../models/Business.js";

// ==========================================
// GET BUSINESS PROFILE
// ==========================================

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

// ==========================================
// UPDATE BUSINESS PROFILE
// ==========================================

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

    // --------------------------------------
    // VALIDATION
    // --------------------------------------

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

    // --------------------------------------
    // BUILD UPDATE
    // --------------------------------------

    const updateData = {
      name: name.trim(),

      businessType:
        businessType.trim(),

      phone:
        phone?.trim() || "",

      email:
        email?.trim().toLowerCase() || "",

      address:
        address?.trim() || "",

      country:
        country?.trim() || "Uganda",

      currency:
        currency?.trim() || "UGX",

      timezone:
        timezone?.trim() || "Africa/Kampala",
    };

    // Only update logo when a value is provided

    if (typeof logo === "string") {
      updateData.logo = logo.trim();
    }

    // --------------------------------------
    // UPDATE BUSINESS
    // --------------------------------------

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
      message:
        "Failed to update business profile",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

export {
  getBusinessProfile,
  updateBusinessProfile,
};
