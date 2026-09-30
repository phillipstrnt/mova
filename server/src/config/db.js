import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    const connection = await mongoose.connect(
      process.env.MONGO_URI,
      {
        retryWrites: false,
      }
    );

    console.log("--------------------------------------");
    console.log("MongoDB connected successfully");
    console.log(`Database: ${connection.connection.name}`);
    console.log(`Host: ${connection.connection.host}`);
    console.log("Retryable writes: DISABLED");
    console.log("--------------------------------------");
  } catch (error) {
    console.error("--------------------------------------");
    console.error("MongoDB connection failed");
    console.error(error.message);
    console.error("--------------------------------------");

    process.exit(1);
  }
};

export default connectDB;