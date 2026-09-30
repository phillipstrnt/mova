import Supplier from "../models/Supplier.js";

const getBusinessId = (req) => {
  return req.user?.businessId || req.user?.business?._id;
};

/**
 * GET /api/suppliers
 */
const getSuppliers = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing from your account.",
      });
    }

    const suppliers = await Supplier.find({
      businessId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers.",
    });
  }
};

/**
 * GET /api/suppliers/:id
 */
const getSupplierById = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier.",
    });
  }
};

/**
 * POST /api/suppliers
 */
const createSupplier = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing from your account.",
      });
    }

    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const supplier = await Supplier.create({
      businessId,
      name: name.trim(),
      contactPerson: contactPerson?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      address: address?.trim() || "",
      taxNumber: taxNumber?.trim() || "",
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
};

/**
 * PUT /api/suppliers/:id
 */
const updateSupplier = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      notes,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        businessId,
      },
      {
        $set: {
          name: name.trim(),
          contactPerson: contactPerson?.trim() || "",
          phone: phone?.trim() || "",
          email: email?.trim().toLowerCase() || "",
          address: address?.trim() || "",
          taxNumber: taxNumber?.trim() || "",
          notes: notes?.trim() || "",
          ...(typeof isActive === "boolean"
            ? { isActive }
            : {}),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
};

/**
 * DELETE /api/suppliers/:id
 */
const deleteSupplier = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        businessId,
      },
      {
        $set: {
          isActive: false,
        },
      },
      {
        new: true,
      }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deactivated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate supplier.",
    });
  }
};

export {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};