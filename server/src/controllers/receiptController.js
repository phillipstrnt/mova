
import ReceiptSettings from "../models/ReceiptSettings.js";

const getReceiptSettings = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const settings =
      await ReceiptSettings.findOne({
        businessId,
      });

    return res.status(200).json({
      success: true,
      settings: settings || null,
    });
  } catch (error) {
    console.error(
      "Get receipt settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load receipt settings",
      error: error.message,
    });
  }
};

const updateReceiptSettings = async (
  req,
  res
) => {
  try {
    const businessId = req.user.businessId;

    const {
      prefix,
      footerMessage,
      showLogo,
      showPhone,
      showAddress,
      showCashier,
    } = req.body;

    const updateData = {};

    if (prefix !== undefined) {
      const normalizedPrefix = String(prefix)
        .trim()
        .toUpperCase();

      if (!normalizedPrefix) {
        return res.status(400).json({
          success: false,
          message:
            "Receipt prefix cannot be empty",
        });
      }

      updateData.prefix =
        normalizedPrefix;
    }

    if (footerMessage !== undefined) {
      updateData.footerMessage =
        String(footerMessage).trim();
    }

    if (showLogo !== undefined) {
      updateData.showLogo =
        Boolean(showLogo);
    }

    if (showPhone !== undefined) {
      updateData.showPhone =
        Boolean(showPhone);
    }

    if (showAddress !== undefined) {
      updateData.showAddress =
        Boolean(showAddress);
    }

    if (showCashier !== undefined) {
      updateData.showCashier =
        Boolean(showCashier);
    }

    const settings =
      await ReceiptSettings.findOneAndUpdate(
        { businessId },
        {
          $set: updateData,
          $setOnInsert: {
            businessId,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Receipt settings saved successfully",
      settings,
    });
  } catch (error) {
    console.error(
      "Update receipt settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save receipt settings",
      error: error.message,
    });
  }
};

export {
  getReceiptSettings,
  updateReceiptSettings,
};