import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./src/models/User.js";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    // --------------------------------------------------
    // CHECK ENVIRONMENT
    // --------------------------------------------------

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from your server .env file."
      );
    }

    // --------------------------------------------------
    // CONNECT TO MONGODB
    // --------------------------------------------------

    let mongoUri = process.env.MONGO_URI;

    if (/[?&]retryWrites=/i.test(mongoUri)) {
      mongoUri = mongoUri.replace(
        /([?&])retryWrites=[^&]*/i,
        "$1retryWrites=false"
      );
    } else {
      const separator = mongoUri.includes("?")
        ? "&"
        : "?";

      mongoUri = `${mongoUri}${separator}retryWrites=false`;
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully.");

    // --------------------------------------------------
    // ASK FOR DETAILS
    // --------------------------------------------------

    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.log("");
      console.log(
        "Usage:"
      );
      console.log(
        'node reset-admin-password.js "email@example.com" "NewPassword123"'
      );
      console.log("");

      await mongoose.disconnect();
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.log(
        "Password must contain at least 6 characters."
      );

      await mongoose.disconnect();
      process.exit(1);
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      console.log("");
      console.log(
        `No MOVA user was found with email: ${normalizedEmail}`
      );
      console.log("");

      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("");
    console.log("User found:");
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
    console.log("");

    // --------------------------------------------------
    // CREATE NEW PASSWORD HASH
    // --------------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    // --------------------------------------------------
    // UPDATE PASSWORD
    // --------------------------------------------------

    user.passwordHash = passwordHash;

    // Make sure the account can log in.
    user.status = "ACTIVE";

    await user.save();

    console.log(
      "=========================================="
    );

    console.log(
      "MOVA ADMIN PASSWORD RESET SUCCESSFUL"
    );

    console.log(
      "=========================================="
    );

    console.log("");
    console.log(`Email: ${user.email}`);
    console.log("Password: [the new password you supplied]");
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
    console.log("");

    console.log(
      "You can now log into MOVA using the new password."
    );

    console.log("");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error(
      "Password reset failed:"
    );
    console.error(error.message);
    console.error("");

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    process.exit(1);
  }
};

resetAdminPassword();