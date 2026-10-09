
import mongoose from "mongoose";
import dotenv from "dotenv";

import Customer from "../models/Customer.js";
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in your .env file.");
  process.exit(1);
}

const migrateCustomers = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ Connected to MongoDB.");
    console.log("");

    const customers = await Customer.find({
      $or: [
        { branchId: { $exists: false } },
        { branchId: null },
      ],
    });

    console.log(
      `📦 Customers without branchId: ${customers.length}`
    );

    if (customers.length === 0) {
      console.log("✅ No customers require migration.");

      await mongoose.disconnect();

      console.log("🔌 MongoDB connection closed.");

      process.exit(0);
    }

    let migrated = 0;
    let skipped = 0;

    for (const customer of customers) {
      try {
        // Find the customer's business
        const business = await Business.findById(customer.businessId)
          .select("_id name");

        if (!business) {
          console.warn(
            `⚠️ Skipping customer "${customer.name}" (${customer._id}) - business not found.`
          );

          skipped++;
          continue;
        }

        // First try to find the MAIN branch
        let branch = await Branch.findOne({
          businessId: business._id,
          code: "MAIN",
        }).select("_id name code");

        // If MAIN does not exist, use the first active branch
        if (!branch) {
          branch = await Branch.findOne({
            businessId: business._id,
            isActive: true,
          }).select("_id name code");
        }

        if (!branch) {
          console.warn(
            `⚠️ Skipping customer "${customer.name}" (${customer._id}) - no active branch found for business "${business.name}".`
          );

          skipped++;
          continue;
        }

        // Assign the branch
        customer.branchId = branch._id;

        await customer.save();

        migrated++;

        console.log(
          `✅ ${customer.name} → ${business.name} / ${branch.name} (${branch.code})`
        );
      } catch (customerError) {
        skipped++;

        console.error(
          `❌ Failed to migrate customer "${customer.name}" (${customer._id})`
        );

        console.error(customerError.message);
      }
    }

    console.log("");
    console.log("========================================");
    console.log(" CUSTOMER MIGRATION COMPLETE");
    console.log("========================================");
    console.log(`Total found:   ${customers.length}`);
    console.log(`Migrated:      ${migrated}`);
    console.log(`Skipped:       ${skipped}`);
    console.log("========================================");
    console.log("");

    await mongoose.disconnect();

    console.log("🔌 MongoDB connection closed.");

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("❌ CUSTOMER MIGRATION FAILED");
    console.error("");
    console.error(error.message);
    console.error("");

    await mongoose.disconnect().catch(() => {});

    process.exit(1);
  }
};

migrateCustomers();