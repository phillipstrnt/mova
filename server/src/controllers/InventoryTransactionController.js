import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";

/*
  Get inventory transactions for the current business.
*/
export const getInventoryTransactions = async (req, res, next) => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      businessId: req.user.businessId,
    };

    if (productId) {
      query.productId = productId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(`${startDate}T00:00:00`);
      }

      if (endDate) {
        query.createdAt.$lte = new Date(`${endDate}T23:59:59`);
      }
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(
      Math.max(Number(limit), 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate("productId", "name sku")
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      InventoryTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
  Get transaction history for one product.
*/
export const getProductInventoryTransactions = async (
  req,
  res,
  next
) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const transactions = await InventoryTransaction.find({
      businessId: req.user.businessId,
      productId,
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      product,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};