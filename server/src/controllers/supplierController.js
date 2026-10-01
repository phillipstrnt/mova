import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";

const getBusinessId = (req) => {
  return req.user?.businessId || null;
};

/*
|--------------------------------------------------------------------------
| GET ALL SUPPLIERS
|--------------------------------------------------------------------------
| GET /api/suppliers
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

    const {
      search = "",
      active = "",
    } = req.query;

    const filter = {
      businessId,
    };

    if (search.trim()) {
      const searchRegex = new RegExp(
        search.trim(),
        "i"
      );

      filter.$or = [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    if (active === "true") {
      filter.isActive = true;
    }

    if (active === "false") {
      filter.isActive = false;
    }

    const suppliers = await Supplier.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    console.error(
      "Get suppliers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE SUPPLIER
|--------------------------------------------------------------------------
| GET /api/suppliers/:id
*/
const getSupplierById = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      businessId,
    }).lean();

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
    console.error(
      "Get supplier by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE SUPPLIER
|--------------------------------------------------------------------------
| POST /api/suppliers
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

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const supplier = await Supplier.create({
      businessId,

      name: name.trim(),

      contactPerson:
        typeof contactPerson === "string"
          ? contactPerson.trim()
          : "",

      phone:
        typeof phone === "string"
          ? phone.trim()
          : "",

      email:
        typeof email === "string"
          ? email.trim().toLowerCase()
          : "",

      address:
        typeof address === "string"
          ? address.trim()
          : "",

      taxNumber:
        typeof taxNumber === "string"
          ? taxNumber.trim()
          : "",

      notes:
        typeof notes === "string"
          ? notes.trim()
          : "",
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      supplier,
    });
  } catch (error) {
    console.error(
      "Create supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE SUPPLIER
|--------------------------------------------------------------------------
| PUT /api/suppliers/:id
*/
const updateSupplier = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
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
      isActive,
    } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const updateData = {
      name: name.trim(),

      contactPerson:
        typeof contactPerson === "string"
          ? contactPerson.trim()
          : "",

      phone:
        typeof phone === "string"
          ? phone.trim()
          : "",

      email:
        typeof email === "string"
          ? email.trim().toLowerCase()
          : "",

      address:
        typeof address === "string"
          ? address.trim()
          : "",

      taxNumber:
        typeof taxNumber === "string"
          ? taxNumber.trim()
          : "",

      notes:
        typeof notes === "string"
          ? notes.trim()
          : "",
    };

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    const supplier =
      await Supplier.findOneAndUpdate(
        {
          _id: req.params.id,
          businessId,
        },
        {
          $set: updateData,
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
    console.error(
      "Update supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DEACTIVATE SUPPLIER
|--------------------------------------------------------------------------
| DELETE /api/suppliers/:id
|--------------------------------------------------------------------------
| We don't physically delete suppliers because old purchases
| may still reference them.
*/
const deleteSupplier = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier =
      await Supplier.findOneAndUpdate(
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
    console.error(
      "Delete supplier error:",
      error
    );

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