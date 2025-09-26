import slugify from "slugify";
import Category from "../../model/categoryModel.js";

// ✅ Create Category
export const createCategory = async (req, res) => {
  try {
    const { name, parent, icon } = req.body;

    const category = new Category({
      name,
      parent: parent || null,
      icon: icon || "🛒", // default icon
    });

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all categories (as a tree)
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean();

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

// ✅ Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent, icon } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (parent !== undefined) category.parent = parent || null;
    if (icon) category.icon = icon;

    await category.save(); // ✅ pre("save") runs, slug auto-updates

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ Delete Category (and children recursively)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRecursively = async (categoryId) => {
      const children = await Category.find({ parent: categoryId });
      for (const child of children) {
        await deleteRecursively(child._id);
      }
      await Category.findByIdAndDelete(categoryId);
    };

    await deleteRecursively(id);

    res.json({ message: "Category and its subcategories deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSlugs = async () => {
  const categories = await Category.find();
  for (let cat of categories) {
    if (!cat.slug) {
      cat.slug = slugify(cat.name, { lower: true, strict: true });
      await cat.save();
    }
  }
  console.log("✅ Slugs updated for all categories!");
};

updateSlugs();

