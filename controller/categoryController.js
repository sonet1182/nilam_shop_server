import categoryModel from "../model/categoryModel.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find().lean();

    // Convert flat list -> nested tree
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => String(cat.parent) === String(parentId))
        .map(cat => ({
          ...cat,
          children: buildTree(cat._id),
        }));
    };

    res.json(buildTree());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
