import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Branch from "../models/Branch.js";
import Business from "../models/Business.js";
import CashierShiftSchedule from "../models/CashierShiftSchedule.js";
import CashierShiftSession from "../models/CashierShiftSession.js";
import Category from "../models/Category.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";
import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Sale from "../models/Sale.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";

const marker = "MOVA_TRIAL_DEMO_V1";
const businessEmail = "owner@trial.mova.test";
const branchSpecs = [
  { code: "MAIN", name: "Main Branch", address: "Demo Market Street" },
  { code: "EAST", name: "East Branch", address: "Demo East Market" },
];
const productSpecs = [
  { sku: "TRIAL-RICE-001", name: "Premium Rice 1 kg", category: "Pantry", barcode: "TRIAL00000001", buyingPrice: 2800, sellingPrice: 3500, unit: "bag", image: "/images/product-pantry.jpg" },
  { sku: "TRIAL-SUGAR-001", name: "White Sugar 1 kg", category: "Pantry", barcode: "TRIAL00000002", buyingPrice: 3200, sellingPrice: 4000, unit: "bag", image: "/images/product-pantry.jpg" },
  { sku: "TRIAL-MILK-001", name: "Fresh Milk 500 ml", category: "Dairy", barcode: "TRIAL00000003", buyingPrice: 1800, sellingPrice: 2500, unit: "bottle", image: "/images/product-milk.jpg" },
  { sku: "TRIAL-BREAD-001", name: "Family Bread", category: "Bakery", barcode: "TRIAL00000004", buyingPrice: 2800, sellingPrice: 3500, unit: "loaf", image: "/images/product-bread.jpg" },
  { sku: "TRIAL-SODA-001", name: "Sparkling Soda 500 ml", category: "Beverages", barcode: "TRIAL00000005", buyingPrice: 1500, sellingPrice: 2500, unit: "bottle", image: "/images/product-drink.jpg" },
  { sku: "TRIAL-COFFEE-001", name: "Ground Coffee 250 g", category: "Beverages", barcode: "TRIAL00000006", buyingPrice: 7000, sellingPrice: 9000, unit: "pack", image: "/images/product-coffee.jpg" },
  { sku: "TRIAL-APPLE-001", name: "Red Apples 1 kg", category: "Produce", barcode: "TRIAL00000007", buyingPrice: 4500, sellingPrice: 6000, unit: "kg", image: "/images/product-apples.jpg" },
  { sku: "TRIAL-BEANS-001", name: "Dry Beans 1 kg", category: "Pantry", barcode: "TRIAL00000008", buyingPrice: 3500, sellingPrice: 5000, unit: "bag", image: "/images/product-pantry.jpg" },
];
const roleSpecs = [
  { key: "owner", email: businessEmail, name: "MOVA Trial Owner", role: "OWNER", branchCodes: ["MAIN", "EAST"] },
  { key: "managerMain", email: "manager.main@trial.mova.test", name: "Main Branch Manager", role: "MANAGER", branchCodes: ["MAIN"] },
  { key: "managerEast", email: "manager.east@trial.mova.test", name: "East Branch Manager", role: "MANAGER", branchCodes: ["EAST"] },
  { key: "cashierMain", email: "cashier.main@trial.mova.test", name: "Main Branch Cashier", role: "CASHIER", branchCodes: ["MAIN"] },
  { key: "cashierEast", email: "cashier.east@trial.mova.test", name: "East Branch Cashier", role: "CASHIER", branchCodes: ["EAST"] },
  { key: "inventory", email: "inventory@trial.mova.test", name: "Trial Inventory Clerk", role: "INVENTORY_MANAGER", branchCodes: ["MAIN", "EAST"] },
  { key: "accountant", email: "accountant@trial.mova.test", name: "Trial Accountant", role: "ACCOUNTANT", branchCodes: ["MAIN", "EAST"] },
];

const requireEnv = (name) => {
  if (!process.env[name]) throw new Error(`${name} is required.`);
  return process.env[name];
};
const startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const pad = (value) => String(value).padStart(2, "0");

async function main() {
  requireEnv("MOVA_ENABLE_TRIAL_SEED");
  if (process.env.MOVA_ENABLE_TRIAL_SEED !== "true") {
    throw new Error("Set MOVA_ENABLE_TRIAL_SEED=true to confirm intentional demo-data creation.");
  }
  const mongoUri = requireEnv("MONGO_URI");
  const password = process.env.MOVA_TRIAL_PASSWORD || `${crypto.randomBytes(18).toString("base64url")}A1!`;
  if (Buffer.byteLength(password, "utf8") > 72) throw new Error("MOVA_TRIAL_PASSWORD must be 72 bytes or fewer.");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const dbName = mongoose.connection.name;
  if (process.env.MOVA_TRIAL_SEED_CONFIRM_DB !== dbName) {
    throw new Error(`Refusing to seed database "${dbName}". Set MOVA_TRIAL_SEED_CONFIRM_DB to that exact database name after checking the target.`);
  }

  const business = await Business.findOneAndUpdate(
    { email: businessEmail, name: "MOVA Trial Market" },
    { $set: { name: "MOVA Trial Market", businessType: "Retail", email: businessEmail, phone: "", address: "Demo data only", country: "Uganda", currency: "UGX", timezone: "Africa/Kampala", isActive: true } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  const businessId = business._id;
  const branches = {};
  for (const spec of branchSpecs) {
    branches[spec.code] = await Branch.findOneAndUpdate(
      { businessId, code: spec.code },
      { $set: { businessId, code: spec.code, name: spec.name, address: spec.address, phone: "", isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const users = {};
  for (const spec of roleSpecs) {
    const branchIds = spec.branchCodes.map((code) => branches[code]._id);
    users[spec.key] = await User.findOneAndUpdate(
      { businessId, email: spec.email },
      { $set: { businessId, branchId: branchIds[0], branchIds, activeBranchId: branchIds[0], name: spec.name, email: spec.email, passwordHash, role: spec.role, status: "ACTIVE", phone: "", profileImage: "" } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
  }
  business.ownerId = users.owner._id;
  await business.save();
  for (const code of ["MAIN", "EAST"]) {
    branches[code].managerId = users[code === "MAIN" ? "managerMain" : "managerEast"]._id;
    await branches[code].save();
  }

  const categories = {};
  for (const name of [...new Set(productSpecs.map((product) => product.category))]) {
    categories[name] = await Category.findOneAndUpdate(
      { businessId, name },
      { $set: { businessId, name, description: `${marker} demo category`, isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
  }
  const products = [];
  for (const spec of productSpecs) {
    products.push(await Product.findOneAndUpdate(
      { businessId, sku: spec.sku },
      { $set: { businessId, categoryId: categories[spec.category]._id, name: spec.name, sku: spec.sku, barcode: spec.barcode, description: `${marker} sample product`, buyingPrice: spec.buyingPrice, sellingPrice: spec.sellingPrice, stockQuantity: 100, minimumStock: 5, image: spec.image, unit: spec.unit, trackStock: true, isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    ));
  }

  const suppliers = {};
  for (const branch of Object.values(branches)) {
    suppliers[branch.code] = await Supplier.findOneAndUpdate(
      { businessId, name: `Trial Supplier ${branch.code}` },
      { $set: { businessId, name: `Trial Supplier ${branch.code}`, contactPerson: "Demo Supplier Contact", phone: "", email: `supplier.${branch.code.toLowerCase()}@trial.mova.test`, address: branch.address, notes: marker, isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const customersByBranch = {};
  for (const branch of Object.values(branches)) {
    customersByBranch[String(branch._id)] = [];
    for (let index = 1; index <= 8; index += 1) {
      const name = `Trial Customer ${branch.code}-${pad(index)}`;
      customersByBranch[String(branch._id)].push(await Customer.findOneAndUpdate(
        { businessId, branchId: branch._id, name },
        { $set: { businessId, branchId: branch._id, name, phone: "", email: `customer.${branch.code.toLowerCase()}.${index}@trial.mova.test`, address: "Demo Market", notes: marker, isActive: true } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      ));
    }
  }

  const stockByBranchProduct = new Map();
  const cashSalesByCashierDay = new Map();
  const today = startOfUtcDay(new Date());
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - 59);
  const openingStock = 100;
  for (const branch of Object.values(branches)) {
    for (const product of products) {
      stockByBranchProduct.set(`${branch._id}:${product._id}`, openingStock);
    }
  }
  const cashierSpecs = [
    { user: users.cashierMain, branch: branches.MAIN, key: "MAIN", manager: users.managerMain },
    { user: users.cashierEast, branch: branches.EAST, key: "EAST", manager: users.managerEast },
  ];
  let salesCreated = 0;
  let paymentsCreated = 0;
  let purchasesCreated = 0;
  for (let offset = 0; offset < 60; offset += 1) {
    const day = new Date(firstDay);
    day.setUTCDate(day.getUTCDate() + offset);
    const dayKey = day.toISOString().slice(0, 10).replaceAll("-", "");

    // Receive one replenishment purchase per branch every other day before that day's sales.
    if (offset % 2 === 0) {
      for (const [branchIndex, spec] of cashierSpecs.entries()) {
        const purchaseNumber = `TRIAL-PUR-${businessId.toString().slice(-6)}-${spec.key}-${dayKey}`;
        const purchaseDate = new Date(day);
        purchaseDate.setUTCHours(6, 0, 0, 0);
        const purchaseItems = [0, 1].map((itemIndex) => {
          const product = products[(Math.floor(offset / 2) + branchIndex + itemIndex * 3) % products.length];
          const quantity = 12 + ((offset + branchIndex + itemIndex) % 9);
          return { productId: product._id, name: product.name, sku: product.sku, quantity, buyingPrice: product.buyingPrice, subtotal: product.buyingPrice * quantity };
        });
        const subtotal = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
        const existingPurchase = await Purchase.findOne({ purchaseNumber }).select("_id").lean();
        const purchase = await Purchase.findOneAndUpdate(
          { purchaseNumber },
          { $set: { businessId, branchId: spec.branch._id, supplierId: suppliers[spec.key]._id, userId: users.inventory._id, purchaseNumber, invoiceNumber: `INV-${purchaseNumber}`, items: purchaseItems, subtotal, discount: 0, total: subtotal, paymentMethod: "CASH", paymentStatus: "PAID", status: "RECEIVED", notes: `${marker} sample stock replenishment`, createdAt: purchaseDate, updatedAt: purchaseDate } },
          { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
        );
        if (!existingPurchase) purchasesCreated += 1;

        for (const item of purchaseItems) {
          const stockKey = `${spec.branch._id}:${item.productId}`;
          const stockBefore = stockByBranchProduct.get(stockKey) || 0;
          const stockAfter = stockBefore + item.quantity;
          stockByBranchProduct.set(stockKey, stockAfter);
          await InventoryTransaction.findOneAndUpdate(
            { businessId, branchId: spec.branch._id, referenceId: purchase._id, productId: item.productId, type: "STOCK_RECEIVED", notes: marker },
            { $set: { businessId, branchId: spec.branch._id, productId: item.productId, userId: users.inventory._id, type: "STOCK_RECEIVED", quantity: item.quantity, stockBefore, stockAfter, reason: "Trial demo supplier delivery", referenceType: "PURCHASE", referenceId: purchase._id, notes: marker, createdAt: purchaseDate, updatedAt: purchaseDate } },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
          );
        }
      }
    }

    for (const [cashierIndex, spec] of cashierSpecs.entries()) {
      const product = products[(offset + cashierIndex) % products.length];
      const customerList = customersByBranch[String(spec.branch._id)];
      const customer = customerList[offset % customerList.length];
      const quantity = 1 + ((offset + cashierIndex) % 3);
      const total = product.sellingPrice * quantity;
      const paymentMethod = ["CASH", "MOBILE_MONEY", "CARD", "BANK"][(offset + cashierIndex) % 4];
      const receiptNumber = `TRIAL-${businessId.toString().slice(-6)}-${spec.key}-${dayKey}`;
      const saleDate = new Date(day);
      saleDate.setUTCHours(8 + ((offset + cashierIndex) % 10), (offset * 11) % 60, 0, 0);
      const existingSale = await Sale.findOne({ receiptNumber }).select("_id").lean();
      const sale = await Sale.findOneAndUpdate(
        { receiptNumber },
        { $set: { businessId, branchId: spec.branch._id, cashierId: spec.user._id, customerId: customer._id, receiptNumber, items: [{ productId: product._id, name: product.name, sku: product.sku, quantity, unitPrice: product.sellingPrice, buyingPrice: product.buyingPrice, subtotal: total }], subtotal: total, discount: 0, total, loyaltyPointsEarned: Math.floor(total / 1000), paymentMethod, paymentStatus: "PAID", status: "COMPLETED", notes: `${marker} sample sale`, createdAt: saleDate, updatedAt: saleDate } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
      );
      if (!existingSale) salesCreated += 1;

      const existingPayment = await Payment.findOne({ businessId, reference: receiptNumber }).select("_id").lean();
      await Payment.findOneAndUpdate(
        { businessId, reference: receiptNumber },
        { $set: { businessId, branchId: spec.branch._id, saleId: sale._id, customerId: customer._id, receivedBy: spec.user._id, amount: total, paymentMethod, reference: receiptNumber, notes: `${marker} sample payment`, status: "COMPLETED", paymentDate: saleDate, createdAt: saleDate, updatedAt: saleDate } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
      );
      if (!existingPayment) paymentsCreated += 1;

      const stockKey = `${spec.branch._id}:${product._id}`;
      const stockBefore = stockByBranchProduct.get(stockKey) || 0;
      stockByBranchProduct.set(stockKey, stockBefore - quantity);
      if (paymentMethod === "CASH") {
        const cashKey = `${spec.user._id}:${dayKey}`;
        cashSalesByCashierDay.set(cashKey, (cashSalesByCashierDay.get(cashKey) || 0) + total);
      }
      await InventoryTransaction.findOneAndUpdate(
        { businessId, branchId: spec.branch._id, referenceId: sale._id, type: "SALE", notes: marker },
        { $set: { businessId, branchId: spec.branch._id, productId: product._id, userId: spec.user._id, type: "SALE", quantity, stockBefore, stockAfter: stockBefore - quantity, reason: "Trial demo sale", referenceType: "SALE", referenceId: sale._id, notes: marker, createdAt: saleDate, updatedAt: saleDate } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
      );
    }
  }

  const trialCustomerPoints = await Sale.aggregate([
    {
      $match: {
        businessId,
        customerId: { $ne: null },
        notes: `${marker} sample sale`,
        status: { $ne: "CANCELLED" },
      },
    },
    {
      $group: {
        _id: "$customerId",
        pointsEarned: { $sum: { $ifNull: ["$loyaltyPointsEarned", 0] } },
        pointsReversed: { $sum: { $ifNull: ["$loyaltyPointsReversed", 0] } },
        pointsRedeemed: { $sum: { $ifNull: ["$loyaltyPointsRedeemed", 0] } },
        pointsRestored: { $sum: { $ifNull: ["$loyaltyPointsRestored", 0] } },
      },
    },
  ]);
  for (const points of trialCustomerPoints) {
    await Customer.updateOne(
      { _id: points._id, businessId },
      {
        $set: {
          loyaltyPoints: Math.max(
            0,
            points.pointsEarned + points.pointsRestored -
              points.pointsReversed - points.pointsRedeemed
          ),
          lifetimeLoyaltyPoints: points.pointsEarned,
        },
      },
    );
  }

  for (const branch of Object.values(branches)) {
    for (const product of products) {
      const finalStock = stockByBranchProduct.get(`${branch._id}:${product._id}`) ?? openingStock;
      await ProductBranchStock.findOneAndUpdate(
        { businessId, branchId: branch._id, productId: product._id },
        { $set: { businessId, branchId: branch._id, productId: product._id, stockQuantity: finalStock, minimumStock: 5, isActive: true } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      );
      await InventoryTransaction.findOneAndUpdate(
        { businessId, branchId: branch._id, productId: product._id, type: "OPENING_STOCK", notes: `${marker}:OPENING` },
        { $set: { businessId, branchId: branch._id, productId: product._id, userId: users.owner._id, type: "OPENING_STOCK", quantity: openingStock, stockBefore: 0, stockAfter: openingStock, reason: "Trial demo opening inventory", referenceType: "OTHER", notes: `${marker}:OPENING`, createdAt: firstDay, updatedAt: firstDay } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, timestamps: false },
      );
    }
  }

  const weekStart = startOfUtcDay(new Date());
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  for (const spec of cashierSpecs) {
    for (let weeksAgo = 8; weeksAgo >= 0; weeksAgo -= 1) {
      const scheduleWeekStart = new Date(weekStart);
      scheduleWeekStart.setUTCDate(scheduleWeekStart.getUTCDate() - weeksAgo * 7);
      await CashierShiftSchedule.findOneAndUpdate(
        { businessId, branchId: spec.branch._id, cashierId: spec.user._id, weekStart: scheduleWeekStart },
        { $set: { businessId, branchId: spec.branch._id, cashierId: spec.user._id, assignedBy: spec.manager._id, weekStart: scheduleWeekStart, days: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isDayOff: dayOfWeek === 6, startTime: dayOfWeek === 6 ? "" : (spec.key === "MAIN" ? "08:00" : "10:00"), endTime: dayOfWeek === 6 ? "" : (spec.key === "MAIN" ? "16:00" : "18:00") })) } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      );
    }
    for (let offset = 0; offset < 60; offset += 1) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - offset);
      const dayKey = day.toISOString().slice(0, 10).replaceAll("-", "");
      const startedAt = new Date(day);
      startedAt.setUTCHours(spec.key === "MAIN" ? 8 : 10, 0, 0, 0);
      const cashSales = cashSalesByCashierDay.get(`${spec.user._id}:${dayKey}`) || 0;
      const openingFloat = 50000;
      const expectedCash = openingFloat + cashSales;
      await CashierShiftSession.findOneAndUpdate(
        { businessId, branchId: spec.branch._id, cashierId: spec.user._id, startedAt, notes: marker },
        { $set: { businessId, branchId: spec.branch._id, cashierId: spec.user._id, status: "CLOSED", startedAt, openingFloat, closedAt: new Date(startedAt.getTime() + 8 * 60 * 60 * 1000), declaredCash: expectedCash + (offset % 3 === 0 ? 500 : 0), expectedCash, variance: offset % 3 === 0 ? 500 : 0, cashSales, notes: marker, closingNotes: "Sample closed trial shift" } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const customer of await Customer.find({ businessId, notes: marker })) {
    const totals = await Sale.aggregate([
      { $match: { businessId, customerId: customer._id, receiptNumber: /^TRIAL-/ } },
      { $group: { _id: null, orders: { $sum: 1 }, spent: { $sum: "$total" } } },
    ]);
    customer.totalOrders = totals[0]?.orders || 0;
    customer.totalSpent = totals[0]?.spent || 0;
    await customer.save();
  }

  console.log(JSON.stringify({
    success: true,
    database: dbName,
    business: { name: business.name, id: String(businessId) },
    branches: Object.values(branches).map(({ name, code, _id }) => ({ name, code, id: String(_id) })),
    products: products.length,
    suppliers: Object.keys(suppliers).length,
    customers: Object.values(customersByBranch).reduce((sum, rows) => sum + rows.length, 0),
    trialSales: 120,
    trialPurchases: 60,
    salesCreated,
    paymentsCreated,
    purchasesCreated,
    scheduledCashiers: cashierSpecs.length,
    closedShiftSessions: cashierSpecs.length * 60,
    accounts: roleSpecs.map(({ name, role, email }) => ({ name, role, email, password })),
    demoMarker: marker,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Unable to seed MOVA trial data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
