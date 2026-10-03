import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import reportRoutes from "./routes/report.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import inventoryTransactionRoutes from "./routes/inventoryTransaction.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import returnRoutes from "./routes/return.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import businessRoutes from "./routes/business.routes.js";
import branchRoutes from "./routes/branch.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/*
|--------------------------------------------------------------------------
| RATE LIMITING
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSERS
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MOVA API is running 🚀",
    version: "0.1.0",
  });
});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  const databaseState = mongoose.connection.readyState;

  res.json({
    success: true,
    server: "online",
    database:
      databaseState === 1
        ? "connected"
        : "disconnected",
  });
});

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/business", businessRoutes);

app.use("/api/branches", branchRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/products", productRoutes);

app.use("/api/sales", saleRoutes);

app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

app.use("/api/customers", customerRoutes);

app.use("/api/returns", returnRoutes);

app.use("/api/suppliers", supplierRoutes);

app.use("/api/purchases", purchaseRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/reports", reportRoutes);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message:
      error.message || "Internal server error",
  });
});

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

const connectDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from the server environment."
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(
      `MOVA server running on http://localhost:${PORT}`
    );
  });
};

startServer();