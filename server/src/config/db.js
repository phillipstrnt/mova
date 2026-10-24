
import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is missing from the server environment."
    );
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      `[MOVA] MongoDB connected successfully: ${mongoose.connection.name}`
    );

    mongoose.connection.on("error", (error) => {
      console.error(
        "[MOVA] MongoDB connection error:",
        error.message
      );
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[MOVA] MongoDB disconnected.");
    });

    return mongoose.connection;
  } catch (error) {
    console.error(
      "[MOVA] MongoDB connection failed:",
      error.message
    );

    throw error;
  }
};

export default connectDB;
