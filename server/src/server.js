import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
*/

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

if (process.env.CLIENT_URL) {
  const configuredOrigins =
    process.env.CLIENT_URL
      .split(",")
      .map((origin) =>
        origin.trim()
      )
      .filter(Boolean);

  for (
    const origin of
    configuredOrigins
  ) {
    if (
      !allowedOrigins.includes(
        origin
      )
    ) {
      allowedOrigins.push(
        origin
      );
    }
  }
}

console.log(
  "Allowed CORS origins:"
);

console.log(
  allowedOrigins
);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy:
      false,
  })
);

/*
|--------------------------------------------------------------------------
| RATE LIMITING
|--------------------------------------------------------------------------
*/

const apiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 300,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many requests. Please try again later.",
    },
  });

app.use(
  "/api",
  apiLimiter
);

/*
|--------------------------------------------------------------------------
| CORS MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      console.warn(
        `CORS blocked origin: ${origin}`
      );

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
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

app.use(
  cookieParser()
);

/*
|--------------------------------------------------------------------------
| REQUEST LOGGER
|--------------------------------------------------------------------------
| This helps us see exactly what reaches the backend.
|--------------------------------------------------------------------------
*/

app.use(
  (req, res, next) => {
    console.log(
      `[MOVA API] ${req.method} ${req.originalUrl}`
    );

    next();
  }
);

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "MOVA API is running 🚀",
      version: "0.1.0",
    });
  }
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    const databaseState =
      mongoose.connection
        .readyState;

    res.status(200).json({
      success: true,

      server:
        "online",

      database:
        databaseState === 1
          ? "connected"
          : "disconnected",
    });
  }
);

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| BUSINESS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/business",
  businessRoutes
);

/*
|--------------------------------------------------------------------------
| BRANCHES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/branches",
  branchRoutes
);

/*
|--------------------------------------------------------------------------
| RECEIPT SETTINGS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/receipt-settings",
  receiptRoutes
);

/*
|--------------------------------------------------------------------------
| CATEGORIES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/categories",
  categoryRoutes
);

/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/products",
  productRoutes
);

/*
|--------------------------------------------------------------------------
| SALES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/sales",
  saleRoutes
);

/*
|--------------------------------------------------------------------------
| INVENTORY TRANSACTIONS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

/*
|--------------------------------------------------------------------------
| CUSTOMERS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/customers",
  customerRoutes
);

/*
|--------------------------------------------------------------------------
| RETURNS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/returns",
  returnRoutes
);

/*
|--------------------------------------------------------------------------
| SUPPLIERS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/suppliers",
  supplierRoutes
);

/*
|--------------------------------------------------------------------------
| PURCHASES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/purchases",
  purchaseRoutes
);

/*
|--------------------------------------------------------------------------
| EXPENSES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/expenses",
  expenseRoutes
);

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/payments",
  paymentRoutes
);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/reports",
  reportRoutes
);

/*
|--------------------------------------------------------------------------
| API 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (req, res, next) => {
    if (
      req.originalUrl.startsWith(
        "/api/"
      )
    ) {
      console.error(
        `[MOVA API 404] ${req.method} ${req.originalUrl}`
      );

      return res
        .status(404)
        .json({
          success: false,

          message:
            `API route not found: ${req.method} ${req.originalUrl}`,

          requestedRoute:
            req.originalUrl,

          availableDashboardRoutes:
            [
              "GET /api/dashboard",
              "GET /api/dashboard/overview",
              "GET /api/dashboard/test",
            ],
        });
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| GENERAL 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,

      message:
        "Route not found",
    });
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(
      error.status || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Internal server error",
    });
  }
);

/*
|--------------------------------------------------------------------------
| MONGODB CONNECTION
|--------------------------------------------------------------------------
*/

const getMongoConnectionString =
  (uri) => {
    if (!uri) {
      throw new Error(
        "MONGO_URI is missing from the server environment."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Disable retryable writes
    |--------------------------------------------------------------------------
    | Required for the MongoDB-compatible deployment
    | previously used by MOVA.
    |--------------------------------------------------------------------------
    */

    if (
      /[?&]retryWrites=/i.test(
        uri
      )
    ) {
      return uri.replace(
        /([?&])retryWrites=[^&]*/i,
        "$1retryWrites=false"
      );
    }

    const separator =
      uri.includes("?")
        ? "&"
        : "?";

    return `${uri}${separator}retryWrites=false`;
  };

const connectDatabase =
  async () => {
    try {
      const mongoUri =
        getMongoConnectionString(
          process.env.MONGO_URI
        );

      console.log(
        "Connecting to MongoDB..."
      );

      await mongoose.connect(
        mongoUri
      );

      console.log(
        "MongoDB connected successfully"
      );
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

const startServer =
  async () => {
    try {
      await connectDatabase();

      app.listen(
        PORT,
        () => {
          console.log(
            "========================================"
          );

          console.log(
            `MOVA server running on http://localhost:${PORT}`
          );

          console.log(
            `MOVA health check: http://localhost:${PORT}/api/health`
          );

          console.log(
            `MOVA dashboard API: http://localhost:${PORT}/api/dashboard`
          );

          console.log(
            `MOVA dashboard overview: http://localhost:${PORT}/api/dashboard/overview`
          );

          console.log(
            `MOVA dashboard test: http://localhost:${PORT}/api/dashboard/test`
          );

          console.log(
            "========================================"
          );
        }
      );
    } catch (error) {
      console.error(
        "Server startup failed:",
        error.message
      );

      process.exit(1);
    }
  };

startServer();