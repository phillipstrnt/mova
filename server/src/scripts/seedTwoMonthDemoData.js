import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import Branch from "../models/Branch.js";
import Business from "../models/Business.js";
import CashierShiftSchedule from "../models/CashierShiftSchedule.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Sale from "../models/Sale.js";
import User from "../models/User.js";

const businessId = process.argv[2];
const marker = "MOVA-DEMO-2MO-V1";
const branchCode = "DEMO02";
const demoBranchName = "Demo Branch 2";
const passwordForDemoUsers = process.env.MOVA_DEMO_CASHIER_PASSWORD || `${crypto.randomBytes(14).toString("base64url")}A1!`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const isoDate = (date) => date.toISOString().slice(0, 10).replaceAll("-", "");

const saveWeeklySchedule = (branchId, cashierId, assignedBy, weekStart, workingDays) =>
  CashierShiftSchedule.findOneAndUpdate(
    { businessId, branchId, cashierId, weekStart },
    {
      $set: {
        assignedBy,
        days: Array.from({ length: 7 }, (_, dayOfWeek) => {
          const hours = workingDays[dayOfWeek];
          return hours ? { dayOfWeek, isDayOff: false, startTime: hours[0], endTime: hours[1] } : { dayOfWeek, isDayOff: true, startTime: "", endTime: "" };
        }),
      },
      $setOnInsert: { businessId, branchId, cashierId, weekStart },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

async function main() {
  assert(mongoose.Types.ObjectId.isValid(businessId || ""), "Pass the target business ID as the first argument.");
  assert(process.env.MONGO_URI, "MONGO_URI is missing from the server environment.");
  await mongoose.connect(process.env.MONGO_URI);
  const business = await Business.findById(businessId).select("name").lean();
  assert(business, "The requested business was not found.");
  const mainBranch = await Branch.findOne({ businessId, code: "MAIN", isActive: true });
  assert(mainBranch, "The target business needs an active MAIN branch.");
  const owner = await User.findOne({ businessId, role: { $in: ["OWNER", "ADMIN"] }, status: "ACTIVE" }).select("_id name");
  assert(owner, "An active business owner or admin is required to assign the demo shifts.");
  const products = await Product.find({ businessId, isActive: true, trackStock: true }).sort({ createdAt: 1 }).limit(5);
  assert(products.length, "Add at least one active tracked product before seeding sales.");

  const secondBranch = await Branch.findOneAndUpdate(
    { businessId, code: branchCode },
    { $set: { name: demoBranchName, isActive: true, address: "Demo data location", managerId: owner._id } },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  const specs = [
    { key: "MAIN", name: "Demo Cashier One", email: "demo.cashier1@mova.test", branch: mainBranch },
    { key: branchCode, name: "Demo Cashier Two", email: "demo.cashier2@mova.test", branch: secondBranch },
  ];
  const cashiers = [];
  const cashierCredentials = [];
  const demoPasswordHash = await bcrypt.hash(passwordForDemoUsers, 12);
  for (const spec of specs) {
    let cashier = await User.findOne({ businessId, email: spec.email });
    if (!cashier) {
      cashier = await User.create({
        businessId, branchId: spec.branch._id, branchIds: [spec.branch._id], activeBranchId: spec.branch._id,
        name: spec.name, email: spec.email, phone: "", passwordHash: demoPasswordHash,
        role: "CASHIER", status: "ACTIVE",
      });
    } else {
      Object.assign(cashier, { name: spec.name, role: "CASHIER", status: "ACTIVE", branchId: spec.branch._id, branchIds: [spec.branch._id], activeBranchId: spec.branch._id, passwordHash: demoPasswordHash });
      await cashier.save();
    }
    cashierCredentials.push({ email: cashier.email, password: passwordForDemoUsers });
    cashiers.push({ ...spec, cashier });
  }

  for (const branch of [mainBranch, secondBranch]) {
    for (const product of products) {
      const openingQuantity = branch._id.equals(secondBranch._id) ? 250 : 180;
      const stock = await ProductBranchStock.findOneAndUpdate(
        { businessId, branchId: branch._id, productId: product._id },
        { $setOnInsert: { stockQuantity: openingQuantity, minimumStock: Math.min(20, openingQuantity), isActive: true } },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      const openingMarker = `${marker}:OPENING:${branch._id}:${product._id}`;
      if (stock.stockQuantity === openingQuantity && !(await InventoryTransaction.exists({ businessId, branchId: branch._id, productId: product._id, notes: openingMarker }))) {
        await InventoryTransaction.create({ businessId, branchId: branch._id, productId: product._id, userId: owner._id, type: "OPENING_STOCK", quantity: openingQuantity, stockBefore: 0, stockAfter: openingQuantity, reason: "Demo branch opening inventory", referenceType: "OTHER", notes: openingMarker });
      }
    }
  }

  const customersByBranch = new Map();
  for (const spec of cashiers) {
    const branchCustomers = [];
    for (let index = 1; index <= 5; index += 1) {
      const name = `Demo Customer ${spec.key}-${String(index).padStart(2, "0")}`;
      branchCustomers.push(await Customer.findOneAndUpdate(
        { businessId, branchId: spec.branch._id, name },
        { $setOnInsert: { businessId, branchId: spec.branch._id, name, phone: "", email: "", notes: `${marker} generated customer`, isActive: true } },
        { upsert: true, returnDocument: "after", runValidators: true },
      ));
    }
    customersByBranch.set(String(spec.branch._id), branchCustomers);
  }

  const today = startOfUtcDay(new Date());
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - 60);
  let createdSales = 0;
  let alreadyPresent = 0;
  for (let dayOffset = 0; dayOffset <= 60; dayOffset += 1) {
    const day = new Date(firstDay);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    const dayKey = isoDate(day);
    for (const [cashierIndex, spec] of cashiers.entries()) {
      const product = products[(dayOffset + cashierIndex) % products.length];
      const quantity = 1 + ((dayOffset + cashierIndex) % 2);
      const unitPrice = Number(product.sellingPrice || 0);
      const buyingPrice = Number(product.buyingPrice || 0);
      assert(unitPrice > 0, `Product ${product.name} needs a selling price greater than zero.`);
      const subtotal = unitPrice * quantity;
      const receiptNumber = `DEMO-${spec.key}-${dayKey}-${String(dayOffset + 1).padStart(3, "0")}`;
      let sale = await Sale.findOne({ businessId, receiptNumber });
      const saleDate = new Date(day);
      saleDate.setUTCHours(9 + ((dayOffset + cashierIndex) % 9), (dayOffset * 13) % 60, 0, 0);
      const customerRows = customersByBranch.get(String(spec.branch._id));
      const customer = customerRows[dayOffset % customerRows.length];
      if (!sale) {
        sale = await Sale.create({
          businessId, branchId: spec.branch._id, cashierId: spec.cashier._id, customerId: customer._id, receiptNumber,
          items: [{ productId: product._id, name: product.name, sku: product.sku, quantity, unitPrice, buyingPrice, subtotal }],
          subtotal, discount: 0, total: subtotal, loyaltyPointsEarned: 0,
          paymentMethod: ["CASH", "MOBILE_MONEY", "CARD", "BANK"][(dayOffset + cashierIndex) % 4],
          paymentStatus: "PAID", status: "COMPLETED", notes: `${marker} · Demo sale for dashboard and reports.`,
          createdAt: saleDate, updatedAt: saleDate,
        });
        createdSales += 1;
      } else alreadyPresent += 1;

      if (!(await Payment.exists({ businessId, saleId: sale._id }))) {
        await Payment.create({ businessId, branchId: spec.branch._id, saleId: sale._id, customerId: customer._id, receivedBy: spec.cashier._id, amount: Number(sale.total), paymentMethod: sale.paymentMethod, reference: receiptNumber, notes: `${marker} · Payment for ${receiptNumber}`, status: "COMPLETED", paymentDate: saleDate, createdAt: saleDate, updatedAt: saleDate });
      }
      if (!(await InventoryTransaction.exists({ businessId, branchId: spec.branch._id, referenceId: sale._id, type: "SALE" }))) {
        const stock = await ProductBranchStock.findOneAndUpdate(
          { businessId, branchId: spec.branch._id, productId: product._id, stockQuantity: { $gte: quantity } },
          { $inc: { stockQuantity: -quantity } },
          { returnDocument: "after" },
        );
        assert(stock, `Insufficient ${product.name} stock at ${spec.branch.name} to complete demo sale ${receiptNumber}.`);
        await InventoryTransaction.create({ businessId, branchId: spec.branch._id, productId: product._id, userId: spec.cashier._id, type: "SALE", quantity, stockBefore: stock.stockQuantity + quantity, stockAfter: stock.stockQuantity, reason: "Product sold", referenceType: "SALE", referenceId: sale._id, notes: `${marker} · Demo stock movement for ${receiptNumber}`, createdAt: saleDate, updatedAt: saleDate });
      }
    }
  }

  const weekStart = startOfUtcDay(new Date());
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  await saveWeeklySchedule(mainBranch._id, cashiers[0].cashier._id, owner._id, weekStart, { 0: ["08:00", "16:00"], 1: ["08:00", "16:00"], 2: ["08:00", "16:00"], 3: ["08:00", "16:00"], 4: ["08:00", "16:00"], 5: ["08:00", "14:00"] });
  await saveWeeklySchedule(secondBranch._id, cashiers[1].cashier._id, owner._id, weekStart, { 0: ["10:00", "18:00"], 1: ["10:00", "18:00"], 2: ["12:00", "20:00"], 3: ["10:00", "18:00"], 4: ["10:00", "18:00"], 5: ["09:00", "15:00"] });

  const demoCustomers = await Customer.find({ businessId, notes: `${marker} generated customer` });
  for (const customer of demoCustomers) {
    const saleStats = await Sale.aggregate([
      { $match: { businessId: customer.businessId, customerId: customer._id, receiptNumber: { $regex: /^DEMO-/ } } },
      { $group: { _id: null, orders: { $sum: 1 }, spent: { $sum: "$total" } } },
    ]);
    customer.totalOrders = saleStats[0]?.orders || 0;
    customer.totalSpent = saleStats[0]?.spent || 0;
    await customer.save();
  }
  if (!(await AuditLog.exists({ businessId, action: "DEMO_OPERATIONS_SEEDED", description: marker }))) {
    await AuditLog.create({ businessId, branchId: secondBranch._id, actorId: owner._id, actorName: owner.name, actorRole: "OWNER", action: "DEMO_OPERATIONS_SEEDED", entity: "DEMO_DATA", description: marker, severity: "INFO", metadata: { salesCreated: createdSales, firstDay, lastDay: today, branchCode, cashierCount: cashiers.length } });
  }

  console.log(JSON.stringify({
    success: true,
    business: business.name,
    branch: { name: secondBranch.name, code: secondBranch.code, id: String(secondBranch._id) },
    cashiers: cashiers.map(({ cashier, branch }) => ({ name: cashier.name, email: cashier.email, branch: branch.name })),
    cashierCredentials,
    scheduleWeekStarts: weekStart.toISOString().slice(0, 10),
    salesPeriod: { from: firstDay.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) },
    demoSalesCreated: createdSales,
    demoSalesAlreadyPresent: alreadyPresent,
    trackedProductsPopulatedPerBranch: products.length,
    marker,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Unable to seed MOVA demo operations data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
