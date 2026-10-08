import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import inventoryTransactionRoutes from "./routes/inventoryTransaction.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import returnRoutes from "./routes/return.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportRoutes from "./routes/report.routes.js";

const app = express();

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| CORS CONFIGURATION
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

/*
|--------------------------------------------------------------------------
| Add CLIENT_URL values from .env
|--------------------------------------------------------------------------
*/

if (process.env.CLIENT_URL) {
  const configuredOrigins = process.env.CLIENT_URL
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  configuredOrigins.forEach((origin) => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

console.log("");
console.log("[MOVA CORS] Allowed origins:");

allowedOrigins.forEach((origin) => {
  console.log(`  - ${origin}`);
});

console.log("");

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header.
      // Useful for Postman, curl and server-to-server requests.
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
          `CORS policy blocked origin: ${origin}`
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

    exposedHeaders: [
      "Content-Length",
    ],

    optionsSuccessStatus: 204,
  })
);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
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
    limit: "10mb",
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| API RATE LIMIT
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 1000,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests from this IP. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| MOVA REQUEST LOGGER
|--------------------------------------------------------------------------
|
| We use our own logger instead of morgan so you don't need
| another npm package.
|
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  console.log(
    `[MOVA API] ${req.method} ${req.originalUrl}`
  );

  next();
});

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MOVA API is running 🚀",
    version: "0.1.0",
    environment:
      process.env.NODE_ENV || "development",
  });
});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MOVA API is healthy 🚀",
    timestamp: new Date().toISOString(),
    environment:
      process.env.NODE_ENV || "development",
  });
});

/*
|--------------------------------------------------------------------------
| CORS / CONNECTION TEST
|--------------------------------------------------------------------------
*/

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MOVA API connection successful.",
    origin: req.headers.origin || null,
  });
});

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/business", businessRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/products", productRoutes);

app.use("/api/sales", salesRoutes);

app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

app.use("/api/customers", customerRoutes);

app.use("/api/returns", returnRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/reports", reportRoutes);

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  console.warn(
    `[MOVA API] Route not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: "API route not found.",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error(
    "[MOVA API ERROR]",
    error
  );

  /*
  |--------------------------------------------------------------------------
  | CORS ERROR
  |--------------------------------------------------------------------------
  */

  if (
    error.message &&
    error.message.startsWith(
      "CORS policy blocked"
    )
  ) {
    return res.status(403).json({
      success: false,
      message:
        "CORS policy blocked this request.",
      error: error.message,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | INVALID JSON
  |--------------------------------------------------------------------------
  */

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | GENERAL ERROR
  |--------------------------------------------------------------------------
  */

  return res.status(
    error.status || 500
  ).json({
    success: false,
    message:
      error.message ||
      "Internal server error.",
    ...(process.env.NODE_ENV !== "production"
      ? {
          stack: error.stack,
        }
      : {}),
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Connect MongoDB
    |--------------------------------------------------------------------------
    */

    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | Start Express
    |--------------------------------------------------------------------------
    */

    app.listen(PORT, () => {
      console.log("");
      console.log(
        "======================================="
      );
      console.log(
        "          MOVA API SERVER"
      );
      console.log(
        "======================================="
      );

      console.log(
        `🚀 Server: http://localhost:${PORT}`
      );

      console.log(
        `❤️  Health: http://localhost:${PORT}/api/health`
      );

      console.log(
        `🧪 Test:   http://localhost:${PORT}/api/test`
      );

      console.log(
        "🗄️  Database: Connected"
      );

      console.log(
        "======================================="
      );

      console.log("");
    });
  } catch (error) {
    console.error("");
    console.error(
      "======================================="
    );
    console.error(
      "       MOVA SERVER STARTUP ERROR"
    );
    console.error(
      "======================================="
    );

    console.error(error);

    console.error(
      "======================================="
    );

    console.error("");

    process.exit(1);
  }
};

startServer();

export default app;