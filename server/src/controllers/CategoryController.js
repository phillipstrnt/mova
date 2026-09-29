import Category from "../models/Category.js";

const createCategory = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existingCategory = await Category.findOne({
      businessId: req.user.businessId,
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists",
      });
    }

    const category = await Category.create({
      businessId: req.user.businessId,
      name: name.trim(),
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const { includeInactive = "false" } = req.query;

    const filter = {
      businessId: req.user.businessId,
    };

    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve category",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      const duplicate = await Category.findOne({
        businessId: req.user.businessId,
        name: trimmedName,
        _id: { $ne: category._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A category with this name already exists",
        });
      }

      category.name = trimmedName;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

const deactivateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = false;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      category,
    });
  } catch (error) {
    console.error("Deactivate category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate category",
    });
  }
};

const activateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = true;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category activated successfully",
      category,
    });
  } catch (error) {
    console.error("Activate category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to activate category",
    });
  }
};

export {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory,
  activateCategory,
};