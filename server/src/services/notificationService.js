
import Notification from "../models/Notification.js";

/*
|----------------------------------------------------------------------
| CREATE NOTIFICATION
|----------------------------------------------------------------------
*/

export const createNotification =
  async ({
    businessId,
    branchId = null,
    userId = null,
    type = "SYSTEM",
    title,
    message,
    priority = "NORMAL",
    link = "",
    metadata = {},
  }) => {
    try {
      if (
        !businessId ||
        !title ||
        !message
      ) {
        console.warn(
          "Notification skipped: required data missing."
        );

        return null;
      }

      const notification =
        await Notification.create({
          businessId,
          branchId,
          userId,
          type,
          title,
          message,
          priority,
          link,
          metadata,
        });

      return notification;
    } catch (error) {
      /*
       * Notification failures should NEVER cause
       * a successful sale or other business operation
       * to fail.
       */

      console.error(
        "Create notification error:",
        error
      );

      return null;
    }
  };

/*
|----------------------------------------------------------------------
| LOW STOCK
|----------------------------------------------------------------------
*/

export const createLowStockNotification =
  async ({
    businessId,
    branchId,
    product,
  }) => {
    const quantity =
      Number(
        product?.stock ??
          product?.quantity ??
          product?.currentStock ??
          0
      );

    const minimum =
      Number(
        product?.minStock ??
          product?.minimumStock ??
          product?.reorderLevel ??
          0
      );

    const isOutOfStock =
      quantity <= 0;

    return createNotification({
      businessId,
      branchId,
      type: isOutOfStock
        ? "OUT_OF_STOCK"
        : "LOW_STOCK",

      title: isOutOfStock
        ? "Product out of stock"
        : "Low stock alert",

      message: isOutOfStock
        ? `${product?.name || "A product"} is out of stock.`
        : `${product?.name || "A product"} has only ${quantity} units remaining. Minimum stock is ${minimum}.`,

      priority: isOutOfStock
        ? "CRITICAL"
        : "HIGH",

      link: product?._id
        ? `/products/${product._id}`
        : "/inventory",

      metadata: {
        productId:
          product?._id || null,

        quantity,
        minimum,
      },
    });
  };

/*
|----------------------------------------------------------------------
| SALE NOTIFICATION
|----------------------------------------------------------------------
*/

export const createSaleNotification =
  async ({
    businessId,
    branchId,
    sale,
    cashierName = "Cashier",
  }) => {
    const total =
      Number(
        sale?.total ??
          sale?.grandTotal ??
          sale?.amount ??
          0
      );

    return createNotification({
      businessId,
      branchId,
      type: "SALE",
      title: "Sale completed",

      message: `${cashierName} completed a sale of UGX ${total.toLocaleString("en-UG")}.`,

      priority: "LOW",

      link: sale?._id
        ? `/sales/${sale._id}`
        : "/sales",

      metadata: {
        saleId:
          sale?._id || null,
        total,
      },
    });
  };

/*
|----------------------------------------------------------------------
| USER NOTIFICATION
|----------------------------------------------------------------------
*/

export const createUserNotification =
  async ({
    businessId,
    userId,
    title,
    message,
    link = "/users",
  }) => {
    return createNotification({
      businessId,
      userId,
      type: "USER",
      title,
      message,
      priority: "NORMAL",
      link,
    });
  };

/*
|----------------------------------------------------------------------
| PAYMENT NOTIFICATION
|----------------------------------------------------------------------
*/

export const createPaymentNotification =
  async ({
    businessId,
    branchId,
    title,
    message,
    priority = "NORMAL",
    link = "/payments",
    metadata = {},
  }) => {
    return createNotification({
      businessId,
      branchId,
      type: "PAYMENT",
      title,
      message,
      priority,
      link,
      metadata,
    });
  };

/*
|----------------------------------------------------------------------
| RETURN NOTIFICATION
|----------------------------------------------------------------------
*/

export const createReturnNotification =
  async ({
    businessId,
    branchId,
    title = "Return activity",
    message,
    priority = "HIGH",
    link = "/returns",
    metadata = {},
  }) => {
    return createNotification({
      businessId,
      branchId,
      type: "RETURN",
      title,
      message,
      priority,
      link,
      metadata,
    });
  };