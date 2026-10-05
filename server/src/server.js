import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// ROUTES
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";

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
import reportRoutes from "./routes/report.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| CLIENT / CORS CONFIGURATION
|--------------------------------------------------------------------------
|
| MOVA can run through:
|
| Development:
| http://localhost:5173
|
| Vite Preview:
| http://localhost:4173
|
| We allow both so switching between `npm run dev`
| and `npm run preview` does not break authentication.
|
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

// Add CLIENT_URL from .env if one exists.
if (process.env.CLIENT_URL) {
  const configuredOrigins = process.env.CLIENT_URL
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins) {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  }
}

console.log("Allowed CORS origins:");
console.log(allowedOrigins);

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
    origin: (origin, callback) => {
      // Allow requests that do not contain an Origin header.
      // Useful for direct server requests and some development tools.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);

      return callback(
        new Error(`CORS blocked origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSING
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| ROOT ROUTE
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

  res.status(200).json({
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

// Authentication
app.use("/api/auth", authRoutes);

// Business
app.use("/api/business", businessRoutes);

// Branches
app.use("/api/branches", branchRoutes);

// Receipt settings
app.use("/api/receipt-settings", receiptRoutes);

// Categories
app.use("/api/categories", categoryRoutes);

// Products
app.use("/api/products", productRoutes);

// Sales
app.use("/api/sales", saleRoutes);

// Inventory transactions
app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

// Customers
app.use("/api/customers", customerRoutes);

// Returns
app.use("/api/returns", returnRoutes);

// Suppliers
app.use("/api/suppliers", supplierRoutes);

// Purchases
app.use("/api/purchases", purchaseRoutes);

// Expenses
app.use("/api/expenses", expenseRoutes);

// Payments
app.use("/api/payments", paymentRoutes);

// Dashboard
app.use("/api/dashboard", dashboardRoutes);

// Reports
app.use("/api/reports", reportRoutes);

/*
|--------------------------------------------------------------------------
| API 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  }

  next();
});

/*
|--------------------------------------------------------------------------
| GENERAL 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    message:
      error.message || "Internal server error",
  });
});

/*
|--------------------------------------------------------------------------
| MONGODB CONNECTION
|--------------------------------------------------------------------------
|
| Some MongoDB-compatible deployments do not support retryable writes.
| This explicitly disables retryable writes.
|
*/

const getMongoConnectionString = (uri) => {
  if (!uri) {
    throw new Error(
      "MONGO_URI is missing from the server environment."
    );
  }

  // Replace an existing retryWrites setting.
  if (/[?&]retryWrites=/i.test(uri)) {
    return uri.replace(
      /([?&])retryWrites=[^&]*/i,
      "$1retryWrites=false"
    );
  }

  // Preserve existing query parameters.
  const separator = uri.includes("?") ? "&" : "?";

  return `${uri}${separator}retryWrites=false`;
};

const connectDatabase = async () => {
  try {
    const mongoUri = getMongoConnectionString(
      process.env.MONGO_URI
    );

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `MOVA server running on http://localhost:${PORT}`
      );

      console.log(
        `MOVA health check: http://localhost:${PORT}/api/health`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();