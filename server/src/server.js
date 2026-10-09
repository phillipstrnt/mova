import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";
import cashierShiftRoutes from "./routes/cashierShift.routes.js";
import auditRoutes from "./routes/audit.routes.js";
// ============================================================
// ROUTES
// ============================================================

import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";
import returnRoutes from "./routes/return.routes.js";
import inventoryTransactionRoutes from "./routes/inventoryTransaction.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportRoutes from "./routes/report.routes.js";
import reportsRoutes from "./routes/reports.routes.js";

// ============================================================
// APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 5000;

// ============================================================
// CORS
// ============================================================

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = [
  ...new Set([
    ...defaultOrigins,
    ...envOrigins,
  ]),
];

console.log(
  "[MOVA] Allowed CORS origins:",
  allowedOrigins
);

const corsOptions = {
  origin: (origin, callback) => {
    /*
     * Requests without an Origin header are allowed.
     * This is useful for direct browser requests,
     * health checks and some development tools.
     */
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `[MOVA CORS] Blocked origin: ${origin}`
    );

    return callback(
      new Error(
        `CORS policy: Origin ${origin} is not allowed`
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
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ============================================================
// SECURITY
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ============================================================
// BODY PARSING
// ============================================================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ============================================================
// COOKIES
// ============================================================

app.use(cookieParser());

// ============================================================
// RATE LIMITING
// ============================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[MOVA API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MOVA API is running 🚀",
    version: "0.1.0",
    environment:
      process.env.NODE_ENV || "development",
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    message: "MOVA API is healthy 🚀",
    timestamp: new Date().toISOString(),
    environment:
      process.env.NODE_ENV || "development",
  });
});

// ============================================================
// API TEST
// ============================================================

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MOVA API test successful",
  });
});

// ============================================================
// AUTHENTICATION
// ============================================================

app.use(
  "/api/auth",
  authRoutes
);

// ============================================================
// BUSINESS
// ============================================================

app.use(
  "/api/business",
  businessRoutes
);


app.use("/api/audit-logs", auditRoutes);
// ============================================================
// BRANCHES
// ============================================================

app.use(
  "/api/branches",
  branchRoutes
);


app.use( "/api/notifications", notificationRoutes );



app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/shifts",
  cashierShiftRoutes
);
// ============================================================
// CATEGORIES
// ============================================================

app.use(
  "/api/categories",
  categoryRoutes
);

// ============================================================
// PRODUCTS
// ============================================================

app.use(
  "/api/products",
  productRoutes
);

// ============================================================
// SALES
// ============================================================

app.use(
  "/api/sales",
  saleRoutes
);

// ============================================================
// PAYMENTS
// ============================================================

app.use(
  "/api/payments",
  paymentRoutes
);

// ============================================================
// RECEIPTS
// ============================================================

app.use(
  "/api/receipts",
  receiptRoutes
);

// ============================================================
// RETURNS
// ============================================================

app.use(
  "/api/returns",
  returnRoutes
);

// ============================================================
// INVENTORY TRANSACTIONS
// ============================================================

app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

// ============================================================
// CUSTOMERS
// ============================================================

app.use(
  "/api/customers",
  customerRoutes
);

// ============================================================
// SUPPLIERS
// ============================================================

app.use(
  "/api/suppliers",
  supplierRoutes
);

// ============================================================
// PURCHASES
// ============================================================

app.use(
  "/api/purchases",
  purchaseRoutes
);

// ============================================================
// EXPENSES
// ============================================================

app.use(
  "/api/expenses",
  expenseRoutes
);

// ============================================================
// DASHBOARD
// ============================================================

app.use(
  "/api/dashboard",
  dashboardRoutes
);

// ============================================================
// REPORTS
// ============================================================

app.use(
  "/api/reports",
  reportsRoutes
);

// Legacy/singular report endpoint
app.use(
  "/api/report",
  reportRoutes
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error(
    "[MOVA ERROR]",
    err
  );

  // ----------------------------------------
  // CORS ERROR
  // ----------------------------------------

  if (
    err.message &&
    err.message.startsWith("CORS policy:")
  ) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // ----------------------------------------
  // INVALID JSON
  // ----------------------------------------

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  // ----------------------------------------
  // MONGOOSE VALIDATION ERROR
  // ----------------------------------------

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(
        err.errors
      ).map(
        (error) => error.message
      ),
    });
  }

  // ----------------------------------------
  // DUPLICATE KEY ERROR
  // ----------------------------------------

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "A record with the same unique value already exists.",
      fields: err.keyValue || {},
    });
  }

  // ----------------------------------------
  // JWT ERROR
  // ----------------------------------------

  if (
    err.name ===
    "JsonWebTokenError"
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid authentication token.",
    });
  }

  if (
    err.name ===
    "TokenExpiredError"
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication token has expired.",
    });
  }

  // ----------------------------------------
  // DEFAULT ERROR
  // ----------------------------------------

  const statusCode =
    err.statusCode ||
    err.status ||
    500;

  return res.status(statusCode).json({
    success: false,
    message:
      err.message ||
      "Internal server error.",

    ...(process.env.NODE_ENV ===
      "development" && {
      stack: err.stack,
    }),
  });
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    console.log(
      "[MOVA] Connecting to MongoDB..."
    );

    await connectDB();

    console.log(
      "[MOVA] MongoDB connected successfully."
    );

    app.listen(PORT, () => {
      console.log("");
      console.log(
        "================================================"
      );
      console.log(
        "              MOVA API SERVER"
      );
      console.log(
        "================================================"
      );

      console.log(
        `🚀 Server: http://localhost:${PORT}`
      );

      console.log(
        `❤️  Health: http://localhost:${PORT}/api/health`
      );

      console.log(
        `🧪 Test: http://localhost:${PORT}/api/test`
      );

      console.log(
        `🌐 Client: ${
          process.env.CLIENT_URL ||
          "http://localhost:5173"
        }`
      );

      console.log(
        `📦 Environment: ${
          process.env.NODE_ENV ||
          "development"
        }`
      );

      console.log(
        "================================================"
      );

      console.log("");
    });
  } catch (error) {
    console.error("");
    console.error(
      "================================================"
    );

    console.error(
      "       MOVA SERVER STARTUP FAILED"
    );

    console.error(
      "================================================"
    );

    console.error(error);

    console.error(
      "================================================"
    );

    console.error("");

    process.exit(1);
  }
};

startServer();

export default app;
