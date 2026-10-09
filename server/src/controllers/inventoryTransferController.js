import mongoose from "mongoose";
import Branch from "../models/Branch.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import InventoryBatch from "../models/InventoryBatch.js";
import InventoryTransfer from "../models/InventoryTransfer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import AuditLog from "../models/AuditLog.js";

const roleOf = (req) => String(req.user?.role || "").toUpperCase();
const idOf = (value) => String(value?._id || value?.id || value || "");
const admin = (req) => ["OWNER", "ADMIN"].includes(roleOf(req));
const allowedBranches = (req) => [req.user?.branchId, req.user?.activeBranchId, ...(req.user?.branchIds || []), ...(req.user?.authorizedBranchIds || [])].map(idOf).filter(Boolean);
const canAccess = (req, id) => admin(req) || allowedBranches(req).includes(idOf(id));

const branchFor = async (businessId, id) => {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) return null;
  return Branch.findOne({ _id: id, businessId, isActive: true }).select("_id name code");
};

export const listInventoryTransfers = async (req, res) => {
  try {
    const filter = { businessId: req.user.businessId };
    if (!admin(req)) {
      const ids = allowedBranches(req);
      filter.$or = [{ sourceBranchId: { $in: ids } }, { destinationBranchId: { $in: ids } }];
    }
    const transfers = await InventoryTransfer.find(filter)
      .populate("sourceBranchId", "name code")
      .populate("destinationBranchId", "name code")
      .populate("requestedBy", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, transfers });
  } catch (error) {
    console.error("List inventory transfers error:", error);
    return res.status(500).json({ success: false, message: "Unable to load transfer requests." });
  }
};

export const createInventoryTransfer = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const source = await branchFor(businessId, req.body.sourceBranchId);
    const destination = await branchFor(businessId, req.body.destinationBranchId);
    if (!source || !destination || String(source._id) === String(destination._id)) return res.status(400).json({ success: false, message: "Choose two different active branches in this business." });
    if (!canAccess(req, source._id) || !canAccess(req, destination._id)) return res.status(403).json({ success: false, message: "You are not assigned to both branches in this transfer." });
    if (!Array.isArray(req.body.items) || !req.body.items.length) return res.status(400).json({ success: false, message: "Add at least one product to the transfer." });
    const quantities = new Map();
    for (const item of req.body.items) {
      const productId = idOf(item.productId);
      const quantity = Number(item.quantity);
      if (!mongoose.Types.ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: "Each transfer line needs a valid product and whole-number quantity." });
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }
    const items = [];
    for (const [productId, quantity] of quantities) {
      const product = await Product.findOne({ _id: productId, businessId, isActive: true }).select("name sku");
      if (!product) return res.status(404).json({ success: false, message: "A selected product is inactive or unavailable." });
      items.push({ productId, name: product.name, sku: product.sku, quantity });
    }
    const transfer = await InventoryTransfer.create({
      businessId,
      sourceBranchId: source._id,
      destinationBranchId: destination._id,
      requestedBy: req.user._id,
      items,
      notes: String(req.body.notes || "").trim().slice(0, 500),
    });
    return res.status(201).json({ success: true, message: "Transfer request submitted for approval.", transfer });
  } catch (error) {
    console.error("Create inventory transfer error:", error);
    return res.status(500).json({ success: false, message: "Unable to create transfer request." });
  }
};

export const reviewInventoryTransfer = async (req, res) => {
  const changedStocks = [];
  const transactionIds = [];
  let transfer;
  try {
    const { status } = req.body || {};
    if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ success: false, message: "Choose approve or reject." });
    transfer = await InventoryTransfer.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId, status: "REQUESTED" },
      { $set: { status: "PROCESSING", reviewedBy: req.user._id, reviewNotes: String(req.body.notes || "").trim().slice(0, 500) } },
      { new: true }
    );
    if (!transfer) return res.status(409).json({ success: false, message: "This transfer was already reviewed or is unavailable." });
    if (!canAccess(req, transfer.sourceBranchId) || !canAccess(req, transfer.destinationBranchId)) {
      await InventoryTransfer.updateOne({ _id: transfer._id }, { $set: { status: "REQUESTED", reviewedBy: null, reviewNotes: "" } });
      return res.status(403).json({ success: false, message: "You are not assigned to both transfer branches." });
    }
    if (status === "REJECTED") {
      transfer.status = "REJECTED";
      transfer.reviewedAt = new Date();
      transfer.reviewNotes = String(req.body.notes || "").trim().slice(0, 500);
      await transfer.save();
      return res.json({ success: true, transfer });
    }

    for (const item of transfer.items) {
      const sourceStock = await ProductBranchStock.findOneAndUpdate(
        { businessId: transfer.businessId, branchId: transfer.sourceBranchId, productId: item.productId, isActive: true, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true }
      );
      if (!sourceStock) throw new Error(`Not enough source stock for ${item.name}.`);
      changedStocks.push({ direction: "OUT", item, sourceStockId: sourceStock._id });

      const destinationStock = await ProductBranchStock.findOneAndUpdate(
        { businessId: transfer.businessId, branchId: transfer.destinationBranchId, productId: item.productId },
        { $inc: { stockQuantity: item.quantity }, $set: { isActive: true }, $setOnInsert: { minimumStock: 0 } },
        { new: true, upsert: true, runValidators: true }
      );
      changedStocks.push({ direction: "IN", item, destinationStockId: destinationStock._id });

      // Keep lot provenance and expiry dates attached to the transferred units.
      const sourceBatches = await InventoryBatch.find({
        businessId: transfer.businessId,
        branchId: transfer.sourceBranchId,
        productId: item.productId,
        status: "ACTIVE",
        remainingQuantity: { $gt: 0 },
        $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
      }).sort({ receivedAt: 1 });
      let remainingToMove = item.quantity;
      for (const batch of sourceBatches) {
        if (remainingToMove <= 0) break;
        const moveQuantity = Math.min(remainingToMove, batch.remainingQuantity);
        batch.remainingQuantity -= moveQuantity;
        if (!batch.remainingQuantity) batch.status = "DEPLETED";
        await batch.save();
        const batchChange = { direction: "BATCH", sourceBatchId: batch._id, destinationBatchId: null, quantity: moveQuantity };
        changedStocks.push(batchChange);
        const destinationBatch = await InventoryBatch.create({
          businessId: transfer.businessId,
          branchId: transfer.destinationBranchId,
          productId: item.productId,
          batchCode: batch.batchCode,
          quantityReceived: moveQuantity,
          remainingQuantity: moveQuantity,
          unitCost: batch.unitCost,
          receivedAt: batch.receivedAt,
          expiryDate: batch.expiryDate,
        });
        batchChange.destinationBatchId = destinationBatch._id;
        remainingToMove -= moveQuantity;
      }

      const sourceBefore = Number(sourceStock.stockQuantity) + item.quantity;
      const destinationBefore = Number(destinationStock.stockQuantity) - item.quantity;
      for (const entry of [
        { branchId: transfer.sourceBranchId, type: "TRANSFER_OUT", before: sourceBefore, after: sourceBefore - item.quantity },
        { branchId: transfer.destinationBranchId, type: "TRANSFER_IN", before: destinationBefore, after: destinationBefore + item.quantity },
      ]) {
        const log = await InventoryTransaction.create({
          businessId: transfer.businessId,
          branchId: entry.branchId,
          productId: item.productId,
          userId: req.user._id,
          type: entry.type,
          quantity: item.quantity,
          stockBefore: Math.max(0, entry.before),
          stockAfter: Math.max(0, entry.after),
          reason: `Transfer ${transfer._id}`,
          referenceType: "TRANSFER",
          referenceId: transfer._id,
          notes: `Approved branch transfer for ${item.name}.`,
        });
        transactionIds.push(log._id);
      }
    }

    transfer.status = "APPROVED";
    transfer.reviewedAt = new Date();
    transfer.reviewNotes = String(req.body.notes || "").trim().slice(0, 500);
    await transfer.save();
    await AuditLog.create({ businessId: transfer.businessId, branchId: transfer.sourceBranchId, actorId: req.user._id, actorName: req.user.name || "", actorRole: roleOf(req), action: "STOCK_TRANSFER_APPROVED", entity: "INVENTORY_TRANSFER", entityId: transfer._id, description: `Approved stock transfer ${transfer._id}.`, severity: "INFO", metadata: { destinationBranchId: transfer.destinationBranchId, itemCount: transfer.items.length } });
    return res.json({ success: true, message: "Transfer approved and branch balances updated.", transfer });
  } catch (error) {
    console.error("Review inventory transfer error:", error);
    for (const change of [...changedStocks].reverse()) {
      if (change.direction === "OUT") await ProductBranchStock.updateOne({ _id: change.sourceStockId }, { $inc: { stockQuantity: change.item.quantity } });
      if (change.direction === "IN") await ProductBranchStock.updateOne({ _id: change.destinationStockId }, { $inc: { stockQuantity: -change.item.quantity } });
      if (change.direction === "BATCH") {
        const destinationBatch = await InventoryBatch.findById(change.destinationBatchId);
        if (destinationBatch) await InventoryBatch.deleteOne({ _id: destinationBatch._id });
        await InventoryBatch.updateOne({ _id: change.sourceBatchId }, { $inc: { remainingQuantity: change.quantity }, $set: { status: "ACTIVE" } });
      }
    }
    if (transactionIds.length) await InventoryTransaction.deleteMany({ _id: { $in: transactionIds } });
    if (transfer?._id) await InventoryTransfer.updateOne({ _id: transfer._id }, { $set: { status: "REQUESTED", reviewedBy: null, reviewNotes: "" } });
    return res.status(400).json({ success: false, message: error.message || "Unable to approve this transfer." });
  }
};
