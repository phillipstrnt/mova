import mongoose from "mongoose";

import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const getCustomers = async (
  req,
  res,
  next
) => {
  try {
    const {
      search = "",
      status = "all",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      businessId: req.user.businessId,
    };

    if (status === "active") {
      query.isActive = true;
    }

    if (status === "inactive") {
      query.isActive = false;
    }

    if (search.trim()) {
      const searchRegex = new RegExp(
        search.trim(),
        "i"
      );

      query.$or = [
        {
          name: searchRegex,
        },
        {
          phone: searchRegex,
        },
        {
          email: searchRegex,
        },
      ];
    }

    const pageNumber = Math.max(
      Number(page),
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit), 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [customers, total] =
      await Promise.all([
        Customer.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber),

        Customer.countDocuments(query),
      ]);

    return res.json({
      success: true,
      customers,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer =
      await Customer.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.json({
      success: true,
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      phone = "",
      email = "",
      address = "",
      creditLimit = 0,
      notes = "",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    const normalizedPhone =
      phone.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (normalizedPhone) {
      const existingPhone =
        await Customer.findOne({
          businessId: req.user.businessId,
          phone: normalizedPhone,
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "A customer with this phone number already exists.",
        });
      }
    }

    if (normalizedEmail) {
      const existingEmail =
        await Customer.findOne({
          businessId: req.user.businessId,
          email: normalizedEmail,
        });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message:
            "A customer with this email already exists.",
        });
      }
    }

    const parsedCreditLimit =
      Number(creditLimit);

    if (
      !Number.isFinite(
        parsedCreditLimit
      ) ||
      parsedCreditLimit < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Credit limit must be zero or greater.",
      });
    }

    const customer =
      await Customer.create({
        businessId: req.user.businessId,
        name: name.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        address: address.trim(),
        creditLimit: parsedCreditLimit,
        outstandingBalance: 0,
        totalOrders: 0,
        totalSpent: 0,
        notes: notes.trim(),
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Customer created successfully.",
      customer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A customer with these details already exists.",
      });
    }

    next(error);
  }
};

export const updateCustomer = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer =
      await Customer.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const {
      name,
      phone,
      email,
      address,
      creditLimit,
      notes,
    } = req.body;

    if (
      name !== undefined &&
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name cannot be empty.",
      });
    }

    if (phone !== undefined) {
      const normalizedPhone =
        phone.trim();

      if (normalizedPhone) {
        const existingPhone =
          await Customer.findOne({
            businessId: req.user.businessId,
            phone: normalizedPhone,
            _id: { $ne: id },
          });

        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message:
              "Another customer already uses this phone number.",
          });
        }
      }

      customer.phone = normalizedPhone;
    }

    if (email !== undefined) {
      const normalizedEmail =
        email.trim().toLowerCase();

      if (normalizedEmail) {
        const existingEmail =
          await Customer.findOne({
            businessId: req.user.businessId,
            email: normalizedEmail,
            _id: { $ne: id },
          });

        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message:
              "Another customer already uses this email.",
          });
        }
      }

      customer.email = normalizedEmail;
    }

    if (name !== undefined) {
      customer.name = name.trim();
    }

    if (address !== undefined) {
      customer.address =
        address.trim();
    }

    if (notes !== undefined) {
      customer.notes = notes.trim();
    }

    if (creditLimit !== undefined) {
      const parsedCreditLimit =
        Number(creditLimit);

      if (
        !Number.isFinite(
          parsedCreditLimit
        ) ||
        parsedCreditLimit < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Credit limit must be zero or greater.",
        });
      }

      customer.creditLimit =
        parsedCreditLimit;
    }

    await customer.save();

    return res.json({
      success: true,
      message:
        "Customer updated successfully.",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const activateCustomer = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer =
      await Customer.findOneAndUpdate(
        {
          _id: id,
          businessId: req.user.businessId,
        },
        {
          $set: {
            isActive: true,
          },
        },
        {
          new: true,
        }
      );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Customer activated successfully.",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateCustomer = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer =
      await Customer.findOneAndUpdate(
        {
          _id: id,
          businessId: req.user.businessId,
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

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Customer deactivated successfully.",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerSales = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer =
      await Customer.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const sales = await Sale.find({
      businessId: req.user.businessId,
      customerId: id,
    })
      .populate(
        "cashierId",
        "name email role"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      customer,
      sales,
    });
  } catch (error) {
    next(error);
  }
};