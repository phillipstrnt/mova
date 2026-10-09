// server/src/controllers/customerController.js

import mongoose from "mongoose";

import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";


// ============================================================
// BRANCH AUTHORIZATION
// ============================================================

const normalizeBranchId = (value) => {
  if (!value) return "";

  const id =
    value?._id ||
    value?.id ||
    (typeof value?.toHexString === "function"
      ? value
      : null) ||
    value;

  return String(id).trim();
};

const getAuthorizedBranchId = (req) => {
  const role = req.user?.role;

  const requestedBranchId = normalizeBranchId(
    req.query?.branchId ||
    req.params?.branchId ||
    req.user?.activeBranchId ||
    req.user?.branchId
  );

  // ----------------------------------------------------------
  // OWNER / ADMIN
  // ----------------------------------------------------------
  // Owner and Admin can work across the business.
  // If no branch is supplied, they may view the business-wide
  // customer list.
  // ----------------------------------------------------------

  if (
    role === "OWNER" ||
    role === "ADMIN"
  ) {
    return requestedBranchId || null;
  }


  // ----------------------------------------------------------
  // OTHER ROLES
  // ----------------------------------------------------------
  // Manager, Cashier, Inventory Manager and Accountant must
  // always operate inside an assigned branch.
  // ----------------------------------------------------------

  if (!requestedBranchId) {
    const error = new Error(
      "No active branch is assigned to this user."
    );

    error.statusCode = 403;

    throw error;
  }


  // ----------------------------------------------------------
  // CHECK USER'S ALLOWED BRANCHES
  // ----------------------------------------------------------

  const allowedBranchIds = [
    ...(Array.isArray(req.user?.authorizedBranchIds)
      ? req.user.authorizedBranchIds
      : []),
    ...(Array.isArray(req.user?.branchIds)
      ? req.user.branchIds
      : []),
    req.user?.branchId,
    req.user?.activeBranchId,
  ]
    .map(normalizeBranchId)
    .filter(Boolean);


  if (
    !allowedBranchIds.includes(
      requestedBranchId
    )
  ) {
    const error = new Error(
      "You are not authorized to access this branch."
    );

    error.statusCode = 403;

    throw error;
  }


  return requestedBranchId;
};


// ============================================================
// BUSINESS ID
// ============================================================

const getBusinessId = (req) => {
  const businessId =
    req.user?.businessId;

  if (!businessId) {
    const error = new Error(
      "User is not associated with a business."
    );

    error.statusCode = 403;

    throw error;
  }

  return businessId;
};


// ============================================================
// OBJECT ID VALIDATION
// ============================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(
    id
  );
};


// ============================================================
// CUSTOMER BRANCH FILTER
// ============================================================

const buildCustomerFilter = (
  req,
  options = {}
) => {
  const {
    includeInactive = false,
  } = options;

  const businessId =
    getBusinessId(req);

  const branchId =
    getAuthorizedBranchId(req);

  const filter = {
    businessId,
  };


  // ----------------------------------------------------------
  // BRANCH SECURITY
  // ----------------------------------------------------------

  if (branchId) {
    filter.branchId = branchId;
  }


  // ----------------------------------------------------------
  // ACTIVE / INACTIVE
  // ----------------------------------------------------------

  if (!includeInactive) {
    filter.isActive = true;
  }


  return {
    filter,
    branchId,
  };
};


// ============================================================
// GET CUSTOMERS
// ============================================================

export const getCustomers = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);


    // --------------------------------------------------------
    // QUERY PARAMETERS
    // --------------------------------------------------------

    const search =
      String(
        req.query.search || ""
      ).trim();

    const status =
      String(
        req.query.status || "active"
      ).toLowerCase();

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;


    // --------------------------------------------------------
    // BASE FILTER
    // --------------------------------------------------------

    const filter = {
      businessId,
    };


    // --------------------------------------------------------
    // BRANCH FIREWALL
    // --------------------------------------------------------

    if (branchId) {
      filter.branchId =
        branchId;
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }


    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search) {
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const searchRegex =
        new RegExp(
          escapedSearch,
          "i"
        );

      filter.$or = [
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


    // --------------------------------------------------------
    // QUERY
    // --------------------------------------------------------

    const [
      customers,
      total,
    ] = await Promise.all([
      Customer.find(filter)
        .sort({
          name: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Customer.countDocuments(
        filter
      ),
    ]);


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    const pages =
      Math.ceil(
        total / limit
      );

    res.json({
      success: true,

      customers,

      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error(
      "Get customers error:",
      error
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to load customers.",
    });
  }
};


// ============================================================
// GET SINGLE CUSTOMER
// ============================================================

export const getCustomer = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);

    const {
      id,
    } = req.params;


    // --------------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------------

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID.",
      });
    }


    // --------------------------------------------------------
    // SECURITY FILTER
    // --------------------------------------------------------

    const filter = {
      _id: id,
      businessId,
    };


    if (branchId) {
      filter.branchId =
        branchId;
    }


    // --------------------------------------------------------
    // FIND CUSTOMER
    // --------------------------------------------------------

    const customer =
      await Customer.findOne(
        filter
      ).lean();


    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you are not authorized to access this customer.",
      });
    }


    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error(
      "Get customer error:",
      error
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to load customer.",
    });
  }
};


// ============================================================
// CREATE CUSTOMER
// ============================================================

export const createCustomer = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);


    // --------------------------------------------------------
    // BRANCH IS REQUIRED FOR NORMAL USERS
    // --------------------------------------------------------

    if (!branchId) {
      return res.status(403).json({
        success: false,
        message:
          "A branch must be selected before creating a customer.",
      });
    }


    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

    const {
      name,
      phone,
      email,
      address,
      creditLimit,
      notes,
    } = req.body;


    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required.",
      });
    }


    // --------------------------------------------------------
    // CREDIT LIMIT
    // --------------------------------------------------------

    const parsedCreditLimit =
      creditLimit === undefined ||
      creditLimit === null ||
      creditLimit === ""
        ? 0
        : Number(creditLimit);


    if (
      !Number.isFinite(
        parsedCreditLimit
      ) ||
      parsedCreditLimit < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Credit limit must be a valid amount.",
      });
    }


    // --------------------------------------------------------
    // CLEAN INPUT
    // --------------------------------------------------------

    const cleanName =
      String(name).trim();

    const cleanPhone =
      String(phone || "").trim();

    const cleanEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    const cleanAddress =
      String(address || "").trim();

    const cleanNotes =
      String(notes || "").trim();


    // --------------------------------------------------------
    // DUPLICATE PHONE CHECK
    // --------------------------------------------------------
    // Only perform this when a phone number is supplied.
    // Duplicate customers are prevented inside the same
    // business + branch.
    // --------------------------------------------------------

    if (cleanPhone) {
      const existingCustomer =
        await Customer.findOne({
          businessId,
          branchId,
          phone: cleanPhone,
        }).lean();


      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message:
            "A customer with this phone number already exists in this branch.",
        });
      }
    }


    // --------------------------------------------------------
    // CREATE CUSTOMER
    // --------------------------------------------------------
    // IMPORTANT:
    //
    // businessId and branchId come from the authenticated
    // user. We NEVER trust these values from req.body.
    // --------------------------------------------------------

    const customer =
      await Customer.create({
        businessId,

        branchId,

        name: cleanName,

        phone: cleanPhone,

        email: cleanEmail,

        address: cleanAddress,

        creditLimit:
          parsedCreditLimit,

        outstandingBalance: 0,

        totalOrders: 0,

        totalSpent: 0,

        notes: cleanNotes,

        isActive: true,
      });


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(201).json({
      success: true,

      message:
        "Customer created successfully.",

      customer,
    });
  } catch (error) {
    console.error(
      "Create customer error:",
      error
    );


    // --------------------------------------------------------
    // MONGOOSE DUPLICATE KEY
    // --------------------------------------------------------

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A customer with these details already exists.",
      });
    }


    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to create customer.",
    });
  }
};


// ============================================================
// UPDATE CUSTOMER
// ============================================================

export const updateCustomer = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);

    const {
      id,
    } = req.params;


    // --------------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------------

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID.",
      });
    }


    // --------------------------------------------------------
    // SECURITY FILTER
    // --------------------------------------------------------

    const filter = {
      _id: id,
      businessId,
    };


    if (branchId) {
      filter.branchId =
        branchId;
    }


    // --------------------------------------------------------
    // FIND CUSTOMER
    // --------------------------------------------------------

    const customer =
      await Customer.findOne(
        filter
      );


    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you are not authorized to edit this customer.",
      });
    }


    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

    const {
      name,
      phone,
      email,
      address,
      creditLimit,
      notes,
    } = req.body;


    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (
      name !== undefined &&
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required.",
      });
    }


    // --------------------------------------------------------
    // CREDIT LIMIT
    // --------------------------------------------------------

    if (
      creditLimit !== undefined
    ) {
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
            "Credit limit must be a valid amount.",
        });
      }


      customer.creditLimit =
        parsedCreditLimit;
    }


    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (
      phone !== undefined
    ) {
      const cleanPhone =
        String(phone).trim();


      if (cleanPhone) {
        const duplicate =
          await Customer.findOne({
            _id: {
              $ne: customer._id,
            },

            businessId,

            branchId:
              customer.branchId,

            phone: cleanPhone,
          }).lean();


        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Another customer with this phone number already exists in this branch.",
          });
        }
      }


      customer.phone =
        cleanPhone;
    }


    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (
      name !== undefined
    ) {
      customer.name =
        String(name).trim();
    }


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (
      email !== undefined
    ) {
      customer.email =
        String(email)
          .trim()
          .toLowerCase();
    }


    // --------------------------------------------------------
    // ADDRESS
    // --------------------------------------------------------

    if (
      address !== undefined
    ) {
      customer.address =
        String(address).trim();
    }


    // --------------------------------------------------------
    // NOTES
    // --------------------------------------------------------

    if (
      notes !== undefined
    ) {
      customer.notes =
        String(notes).trim();
    }


    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    await customer.save();


    res.json({
      success: true,

      message:
        "Customer updated successfully.",

      customer,
    });
  } catch (error) {
    console.error(
      "Update customer error:",
      error
    );


    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A customer with these details already exists.",
      });
    }


    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to update customer.",
    });
  }
};


// ============================================================
// ACTIVATE CUSTOMER
// ============================================================

export const activateCustomer = async (
  req,
  res
) => {
  return updateCustomerStatus(
    req,
    res,
    true
  );
};


// ============================================================
// DEACTIVATE CUSTOMER
// ============================================================

export const deactivateCustomer = async (
  req,
  res
) => {
  return updateCustomerStatus(
    req,
    res,
    false
  );
};


// ============================================================
// UPDATE CUSTOMER STATUS
// ============================================================

const updateCustomerStatus = async (
  req,
  res,
  isActive
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);

    const {
      id,
    } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID.",
      });
    }


    const filter = {
      _id: id,
      businessId,
    };


    if (branchId) {
      filter.branchId =
        branchId;
    }


    const customer =
      await Customer.findOneAndUpdate(
        filter,

        {
          $set: {
            isActive,
          },
        },

        {
          new: true,
        }
      );


    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you are not authorized to modify this customer.",
      });
    }


    res.json({
      success: true,

      message: isActive
        ? "Customer activated successfully."
        : "Customer deactivated successfully.",

      customer,
    });
  } catch (error) {
    console.error(
      "Update customer status error:",
      error
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to update customer status.",
    });
  }
};


// ============================================================
// DELETE CUSTOMER
// ============================================================

export const deleteCustomer = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);

    const {
      id,
    } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID.",
      });
    }


    const filter = {
      _id: id,
      businessId,
    };


    if (branchId) {
      filter.branchId =
        branchId;
    }


    const customer =
      await Customer.findOne(
        filter
      );


    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you are not authorized to delete this customer.",
      });
    }


    // --------------------------------------------------------
    // SAFER APPROACH
    // --------------------------------------------------------
    // Do not permanently delete customers who have transaction
    // history. Deactivate them instead.
    // --------------------------------------------------------

    if (
      Number(customer.totalOrders || 0) >
        0 ||
      Number(
        customer.totalSpent || 0
      ) > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This customer has transaction history and cannot be deleted. Deactivate the customer instead.",
      });
    }


    await Customer.deleteOne({
      _id: customer._id,
    });


    res.json({
      success: true,

      message:
        "Customer deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete customer error:",
      error
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to delete customer.",
    });
  }
};


// ============================================================
// CUSTOMER SALES HISTORY
// ============================================================

export const getCustomerSales = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    const branchId =
      getAuthorizedBranchId(req);

    const {
      id,
    } = req.params;


    // --------------------------------------------------------
    // VALIDATE CUSTOMER ID
    // --------------------------------------------------------

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID.",
      });
    }


    // --------------------------------------------------------
    // CUSTOMER SECURITY CHECK
    // --------------------------------------------------------

    const customerFilter = {
      _id: id,
      businessId,
    };


    if (branchId) {
      customerFilter.branchId =
        branchId;
    }


    const customer =
      await Customer.findOne(
        customerFilter
      ).lean();


    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you are not authorized to access this customer.",
      });
    }


    // --------------------------------------------------------
    // SALES FILTER
    // --------------------------------------------------------

    const salesFilter = {
      businessId,

      customerId: customer._id,
    };


    // --------------------------------------------------------
    // CRITICAL BRANCH FIREWALL
    // --------------------------------------------------------

    if (branchId) {
      salesFilter.branchId =
        branchId;
    }


    // --------------------------------------------------------
    // GET SALES
    // --------------------------------------------------------

    const sales =
      await Sale.find(
        salesFilter
      )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();


    res.json({
      success: true,

      sales,
    });
  } catch (error) {
    console.error(
      "Get customer sales error:",
      error
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to load customer sales history.",
    });
  }
};
