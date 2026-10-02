import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

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

dotenv.config();

connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "2mb",
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
| API Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| Categories
|--------------------------------------------------------------------------
*/

app.use(
  "/api/categories",
  categoryRoutes
);

/*
|--------------------------------------------------------------------------
| Products
|--------------------------------------------------------------------------
*/

app.use(
  "/api/products",
  productRoutes
);

/*
|--------------------------------------------------------------------------
| Sales
|--------------------------------------------------------------------------
*/

app.use(
  "/api/sales",
  saleRoutes
);

/*
|--------------------------------------------------------------------------
| Inventory Transactions
|--------------------------------------------------------------------------
*/

app.use(
  "/api/inventory-transactions",
  inventoryTransactionRoutes
);

/*
|--------------------------------------------------------------------------
| Customers
|--------------------------------------------------------------------------
*/

app.use(
  "/api/customers",
  customerRoutes
);

/*
|--------------------------------------------------------------------------
| Returns
|--------------------------------------------------------------------------
*/

app.use(
  "/api/returns",
  returnRoutes
);

/*
|--------------------------------------------------------------------------
| Suppliers
|--------------------------------------------------------------------------
*/

app.use(
  "/api/suppliers",
  supplierRoutes
);

/*
|--------------------------------------------------------------------------
| Purchases
|--------------------------------------------------------------------------
*/

app.use(
  "/api/purchases",
  purchaseRoutes
);

/*
|--------------------------------------------------------------------------
| Expenses
|--------------------------------------------------------------------------
*/

app.use(
  "/api/expenses",
  expenseRoutes
);

/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MOVA API is running 🚀",
    platform: "MOVA",
    version: "0.1.0",
  });
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "healthy",
      service: "MOVA API",
      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| 404 Handler
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
| Global Error Handler
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
      "Server Error:",
      error
    );

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
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log("");

    console.log(
      "======================================"
    );

    console.log(
      "          MOVA API SERVER"
    );

    console.log(
      "======================================"
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );

    console.log(
      "======================================"
    );

    console.log("");
  }
);