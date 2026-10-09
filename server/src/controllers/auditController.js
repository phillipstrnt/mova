
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import Branch from "../models/Branch.js";

const POS_AUDIT_ACTIONS = new Set([
  "CART_ITEM_REMOVED",
  "CART_CLEARED",
  "DISCOUNT_APPLIED",
  "DISCOUNT_CHANGED",
  "OFFLINE_SALE_SYNCED",
]);

export const createPosAuditEvent = async (req, res) => {
  try {
    const { action, description = "", entityId = null, metadata = {} } = req.body || {};
    if (!POS_AUDIT_ACTIONS.has(String(action || ""))) {
      return res.status(400).json({ success: false, message: "Unsupported cashier activity." });
    }
    const branchId = req.body.branchId || req.user?.activeBranchId || req.user?.branchId || null;
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(String(branchId))) return res.status(400).json({ success: false, message: "Invalid branch for this cashier activity." });
      const branchAllowed = isOwnerOrAdmin(req) || [req.user?.branchId, req.user?.activeBranchId, ...(req.user?.branchIds || []), ...(req.user?.authorizedBranchIds || [])].some((id) => String(id?._id || id?.id || id) === String(branchId));
      if (!branchAllowed) return res.status(403).json({ success: false, message: "You cannot record activities for this branch." });
      const branchExists = await Branch.exists({ _id: branchId, businessId: req.user.businessId, isActive: true });
      if (!branchExists) return res.status(404).json({ success: false, message: "Branch not found or inactive." });
    }
    const safeMetadata = {};
    for (const key of ["productId", "productName", "quantity", "discountAmount", "itemCount", "clientSaleId"]) {
      const value = metadata?.[key];
      if (value !== undefined) safeMetadata[key] = typeof value === "string" ? value.slice(0, 120) : Number(value);
    }
    const log = await AuditLog.create({
      businessId: req.user.businessId,
      branchId,
      actorId: req.user._id,
      actorName: req.user.name || "",
      actorRole: String(req.user.role || "").toUpperCase(),
      action,
      entity: "POS_ACTIVITY",
      entityId,
      description: String(description || action).slice(0, 500),
      severity: ["CART_CLEARED", "DISCOUNT_APPLIED"].includes(action) ? "WARNING" : "INFO",
      metadata: safeMetadata,
      ipAddress: req.ip || "",
      userAgent: String(req.get("user-agent") || "").slice(0, 500),
    });
    return res.status(201).json({ success: true, logId: log._id });
  } catch (error) {
    console.error("Create POS audit event error:", error);
    return res.status(500).json({ success: false, message: "Unable to record cashier activity." });
  }
};

const isOwnerOrAdmin = (req) => {
  return (
    req.user?.role === "OWNER" ||
    req.user?.role === "ADMIN"
  );
};


/*
|--------------------------------------------------------------------------
| GET AUDIT LOGS
|--------------------------------------------------------------------------
*/

export const getAuditLogs = async (
  req,
  res
) => {
  try {
    const businessId =
      req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message:
          "Business context is missing.",
      });
    }

    const {
      branchId,
      actorId,
      action,
      entity,
      severity,
      search,
      page = 1,
      limit = 30,
    } = req.query;

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(Number(limit) || 30, 1),
      100
    );

    const filter = {
      businessId,
    };

    /*
     * Branch security
     */

    if (isOwnerOrAdmin(req)) {
      if (branchId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            branchId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid branch ID.",
          });
        }

        filter.branchId = branchId;
      }
    } else {
      const allowedBranchIds =
        Array.isArray(req.user?.branchIds)
          ? req.user.branchIds.map((id) =>
              String(id)
            )
          : [];

      if (branchId) {
        if (
          !allowedBranchIds.includes(
            String(branchId)
          )
        ) {
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to this branch.",
          });
        }

        filter.branchId = branchId;
      } else {
        filter.$or = [
          {
            branchId: null,
          },
          {
            branchId: {
              $in: allowedBranchIds,
            },
          },
        ];
      }
    }

    if (actorId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          actorId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid actor ID.",
        });
      }

      filter.actorId = actorId;
    }

    if (action) {
      filter.action = action;
    }

    if (entity) {
      filter.entity = entity;
    }

    if (severity) {
      filter.severity = severity;
    }

    if (search?.trim()) {
      const searchRegex =
        new RegExp(
          search.trim().replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          ),
          "i"
        );

      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            {
              description:
                searchRegex,
            },
            {
              actorName:
                searchRegex,
            },
            {
              action:
                searchRegex,
            },
            {
              entity:
                searchRegex,
            },
          ],
        },
      ];
    }

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      logs,
      total,
    ] = await Promise.all([
      AuditLog.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .populate(
          "actorId",
          "name email role"
        )
        .populate(
          "branchId",
          "name code"
        )
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      logs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages:
          Math.ceil(
            total / safeLimit
          ) || 1,
      },
    });
  } catch (error) {
    console.error(
      "Get audit logs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load audit logs.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE AUDIT LOG
|--------------------------------------------------------------------------
*/

export const getAuditLog = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid audit log ID.",
      });
    }

    const filter = {
      _id: id,
      businessId:
        req.user.businessId,
    };

    if (!isOwnerOrAdmin(req)) {
      const allowedBranchIds =
        Array.isArray(req.user?.branchIds)
          ? req.user.branchIds.map((item) =>
              String(item)
            )
          : [];

      filter.$or = [
        {
          branchId: null,
        },
        {
          branchId: {
            $in: allowedBranchIds,
          },
        },
      ];
    }

    const log =
      await AuditLog.findOne(filter)
        .populate(
          "actorId",
          "name email role"
        )
        .populate(
          "branchId",
          "name code"
        )
        .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message:
          "Audit log not found.",
      });
    }

    return res.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error(
      "Get audit log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load audit log.",
    });
  }
};
