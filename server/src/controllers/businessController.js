import Business from "../models/Business.js";
import Branch from "../models/Branch.js";
import ReceiptSettings from "../models/ReceiptSettings.js";

/*
|--------------------------------------------------------------------------
| GET BUSINESS PROFILE
|--------------------------------------------------------------------------
*/
export const getBusinessProfile = async (req, res) => {
  try {
    const businessId =
      req.user?.businessId ||
      req.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "Business information is missing.",
      });
    }

    const business = await Business.findById(
      businessId
    ).lean();

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    return res.status(200).json({
      business,
    });
  } catch (error) {
    console.error(
      "Get business profile error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to retrieve business profile.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE BUSINESS PROFILE
|--------------------------------------------------------------------------
*/
export const updateBusinessProfile = async (
  req,
  res
) => {
  try {
    const businessId =
      req.user?.businessId ||
      req.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "Business information is missing.",
      });
    }

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
        message: "Business name is required.",
      });
    }

    if (!businessType || !businessType.trim()) {
      return res.status(400).json({
        message: "Business type is required.",
      });
    }

    const business =
      await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    business.name = name.trim();
    business.businessType =
      businessType.trim();

    if (phone !== undefined) {
      business.phone =
        phone?.trim() || "";
    }

    if (email !== undefined) {
      business.email =
        email?.trim().toLowerCase() || "";
    }

    if (address !== undefined) {
      business.address =
        address?.trim() || "";
    }

    if (country !== undefined) {
      business.country =
        country?.trim() || "Uganda";
    }

    if (currency !== undefined) {
      business.currency =
        currency?.trim() || "UGX";
    }

    if (timezone !== undefined) {
      business.timezone =
        timezone?.trim() ||
        "Africa/Kampala";
    }

    if (logo !== undefined) {
      business.logo = logo || "";
    }

    await business.save();

    return res.status(200).json({
      message:
        "Business profile updated successfully.",
      business,
    });
  } catch (error) {
    console.error(
      "Update business profile error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update business profile.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SETUP STATUS
|--------------------------------------------------------------------------
|
| MOVA considers onboarding complete when:
|
| 1. Business details are complete
| 2. At least one active branch exists
| 3. Receipt settings exist
|
|--------------------------------------------------------------------------
*/
export const getSetupStatus = async (
  req,
  res
) => {
  try {
    const businessId =
      req.user?.businessId ||
      req.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "Business information is missing.",
      });
    }

    const business =
      await Business.findById(
        businessId
      ).lean();

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    /*
     * BUSINESS SETUP
     */
    const businessComplete =
      Boolean(
        business.name?.trim() &&
          business.businessType?.trim()
      );

    /*
     * BRANCH SETUP
     */
    const activeBranchCount =
      await Branch.countDocuments({
        businessId,
        status: {
          $ne: "INACTIVE",
        },
      });

    const branchComplete =
      activeBranchCount > 0;

    /*
     * RECEIPT SETUP
     */
    const receiptSettings =
      await ReceiptSettings.findOne({
        businessId,
      }).lean();

    const receiptComplete =
      Boolean(receiptSettings);

    /*
     * OVERALL STATUS
     */
    const setupComplete =
      businessComplete &&
      branchComplete &&
      receiptComplete;

    /*
     * DETERMINE NEXT STEP
     */
    let nextStep = null;

    if (!businessComplete) {
      nextStep = "business";
    } else if (!branchComplete) {
      nextStep = "branch";
    } else if (!receiptComplete) {
      nextStep = "receipt";
    }

    return res.status(200).json({
      setupComplete,

      nextStep,

      steps: {
        business: businessComplete,
        branch: branchComplete,
        receipt: receiptComplete,
      },

      business: {
        _id: business._id,
        name: business.name,
        businessType:
          business.businessType,
      },
    });
  } catch (error) {
    console.error(
      "Get setup status error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to verify business setup.",
    });
  }
};