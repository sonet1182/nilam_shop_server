import Product from "../model/productModel.js";
import fs from "fs";
import path from "path";
import bidModel from "../model/bidModel.js";
import categoryModel from "../model/categoryModel.js";

// Multer দিয়ে প্রাপ্ত images ফাইল নাম বা path গুলো req.files থেকে পাবেন
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      bidStart,
      bidEnd,
      productType,
      deliveryCost,
      location,
      phone,
      category,
      condition,
      stock,
      unit,
      tags,
    } = req.body;

    if (!name || !price || !description || !bidStart || !bidEnd || !category) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required." });
    }

    // multer files to array of filenames
    const images = req.files.map((file) => file.filename);

    // Get the full category path (parent chain)
    const buildCategoryPath = async (catId) => {
      const cat = await categoryModel.findById(catId);
      if (!cat) return [];
      if (!cat.parent) return [cat._id]; // root category
      const parentPath = await buildCategoryPath(cat.parent);
      return [...parentPath, cat._id];
    };

    const categoryPath = await buildCategoryPath(category);

    const newProduct = new Product({
      name,
      price,
      description,
      bidStart: new Date(bidStart),
      bidEnd: new Date(bidEnd),
      productType,
      deliveryCost: deliveryCost || 0,
      location: location || "",
      phone: phone || "",
      category,
      categoryPath,
      condition: condition || "new",
      stock: stock ? parseInt(stock) : 0,
      unit: unit || "piece",
      tags: tags ? tags.split(",") : [],
      images,
      createdBy: req.userId ?? 1,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({ message: "Product created successfully", product: savedProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: error.message });
  }
};
// 📌 Get All Products
export const getProducts = async (req, res) => {
  try {
    // Get page & limit from query params (default: page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const categoryName = req.query.category || "";
    const myshop = req.query.myshop;
    const seller_id = req.query.seller_id;

    const userId = req.userId;
    if (myshop && !userId) {
      return res.status(401).json({ error: "Unauthorized: user not logged in" });
    }

    // Build search condition
    let query = {};
    // myshop filter
    if (myshop && userId) {
      query.createdBy = userId;
    }
    if (seller_id) {
      query.createdBy = seller_id;
    }

    // search filter (merge with existing query)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    console.log('categoryName:', categoryName);

    let category = null;

    // 🔹 Category filter using categoryPath
    if (categoryName) {
      category = await categoryModel.findOne({ slug: categoryName }).exec();
      if (category) {
        query.$or = [
          { category: category._id },
          { categoryPath: category._id } // matches parent categories
        ];
      } else {
        // category not found → return empty result
        return res.status(200).json({
          total: 0,
          page,
          totalPages: 0,
          links: {},
          data: [],
        });
      }
    }

    // Calculate how many documents to skip
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await Product.find(query)
      .populate("createdBy", "name email image")
      .populate("category", "name slug icon")
      .populate({
        path: "categoryPath",
        select: "name slug icon", // get name + icon for each parent category
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // ✅ Count only filtered products
    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Build page links (preserve search param if present)
    const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
    const queryParam = search ? `&search=${encodeURIComponent(search)}` : "";

    const links = {
      self: `${baseUrl}?page=${page}&limit=${limit}${queryParam}`,
      first: `${baseUrl}?page=1&limit=${limit}${queryParam}`,
      last: `${baseUrl}?page=${totalPages}&limit=${limit}${queryParam}`,
      prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}${queryParam}` : null,
      next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}${queryParam}` : null,
      current_page: page,
    };

    // 🔹 Get normalized counts from bids collection
    const productIds = products.map((p) => p._id);
    const bidCounts = await bidModel.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
    ]);

    const bidCountMap = bidCounts.reduce((acc, b) => {
      acc[b._id.toString()] = b.count;
      return acc;
    }, {});

    const formattedProducts = products.map((product) => {
      const categoryBreadcrumb = product.categoryPath.map(c => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        icon: c.icon || "🛒",
      }));

      return {
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images,
        thumbnail: product.images && product.images.length > 0 ? product.images[0] : null,
        createdBy: product.createdBy ?? null,
        createdAt: product.createdAt ?? null,
        bidStart: product.bidStart ?? null,
        bidEnd: product.bidEnd ?? null,
        productType: product.productType ?? null,
        deliveryCost: product.deliveryCost ?? null,
        location: product.location ?? null,
        phone: product.phone ?? null,
        category: product.category ?? null,
        condition: product.condition ?? null,
        stock: product.stock ?? null,
        unit: product.unit ?? null,
        tags: product.tags ?? null,
        // ⚡ Both values:
        totalBidsCached: product.totalBids ?? 0,            // denormalized
        totalBids: bidCountMap[product._id.toString()] || 0, // normalized
        categoryBreadcrumb,
      }
    });

    res.status(200).json({
      total,
      page,
      totalPages,
      links,
      data: formattedProducts,
      categoryTitle: categoryName && category ? category.name : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 📌 Get Single Product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id })
      .populate("createdBy", "_id name image email")
      .populate("category", "name slug icon")
      .populate({
        path: "categoryPath",
        select: "name slug icon",
      }).exec();
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 🔹 Get normalized bid count
    const realBidCount = await bidModel.countDocuments({ productId: product._id });

    // 🔹 Build clickable breadcrumb array using populated categoryPath
    const categoryBreadcrumb = product.categoryPath.map(c => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      icon: c.icon || "🛒",
    }));

    res.status(200).json({
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      thumbnail: product.images && product.images.length > 0 ? product.images[0] : null,
      createdBy: product.createdBy ?? null,
      createdAt: product.createdAt ?? null,
      bidStart: product.bidStart ?? null,
      bidEnd: product.bidEnd ?? null,
      productType: product.productType ?? null,
      deliveryCost: product.deliveryCost ?? null,
      location: product.location ?? null,
      phone: product.phone ?? null,
      category: product.category ?? null,
      condition: product.condition ?? null,
      stock: product.stock ?? null,
      unit: product.unit ?? null,
      tags: product.tags ?? null,
      totalBids: realBidCount ?? 0,
      categoryBreadcrumb,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Update Product
// Update product + optionally replace images
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      price,
      description,
      bidStart,
      bidEnd,
      productType,
      deliveryCost,
      location,
      phone,
      category,
      condition,
      stock,
      unit,
      tags,
      removeImages, // optional array of filenames to delete
    } = req.body;

    // 1️⃣ Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ Remove specific old images (if requested)
    if (removeImages && Array.isArray(removeImages) && removeImages.length > 0) {
      removeImages.forEach((img) => {
        const imgPath = path.join("uploads", img);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      });

      // remove deleted images from the array
      product.images = product.images.filter(
        (img) => !removeImages.includes(img)
      );
    }

    // 3️⃣ Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImageFilenames = req.files.map((file) => file.filename);
      product.images = [...product.images, ...newImageFilenames]; // append instead of replacing
    }

    // 4️⃣ Update other fields only if provided
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (bidStart !== undefined) product.bidStart = bidStart;
    if (bidEnd !== undefined) product.bidEnd = bidEnd;
    if (productType !== undefined) product.productType = productType;
    if (deliveryCost !== undefined) product.deliveryCost = deliveryCost;
    if (location !== undefined) product.location = location;
    if (phone !== undefined) product.phone = phone;
    if (category !== undefined) {
      product.category = category;
      const buildCategoryPath = async (catId) => {
        const cat = await categoryModel.findById(catId);
        if (!cat) return [];
        if (!cat.parent) return [cat._id]; // root category
        const parentPath = await buildCategoryPath(cat.parent);
        return [...parentPath, cat._id];
      };

      const categoryPath = await buildCategoryPath(category);
      product.categoryPath = categoryPath;
    }
    if (condition !== undefined) product.condition = condition;
    if (stock !== undefined) product.stock = stock;
    if (unit !== undefined) product.unit = unit;

    if (tags !== undefined) {
      product.tags = Array.isArray(tags)
        ? tags
        : tags.split(",").map((t) => t.trim());
    }

    // 5️⃣ Save the updated product
    const updatedProduct = await product.save();

    res.status(200).json({
      message: "✅ Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.images.forEach((img) => {
      const imgPath = path.join("uploads", img);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Example Express route
export const productBids = async (req, res) => {
  try {
    const bids = await bidModel
      .find({ productId: req.params.id })
      .sort({ amount: -1 })
      .populate("user", "name image _id");

    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bids" });
  }
};

export const updateProduct2 = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      description,
      bidStart,
      bidEnd,
      productType,
      deliveryCost,
      location,
      phone,
      category,
      condition,
      stock,
      unit,
      tags,
      existingImages = [],
    } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    const newImages = req.files?.map((f) => f.filename) || [];
    const finalImages = [...existingImages, ...newImages];

    product.name = name;
    product.price = price;
    product.description = description;
    product.bidStart = new Date(bidStart);
    product.bidEnd = new Date(bidEnd);
    product.productType = productType;
    product.deliveryCost = deliveryCost || 0;
    product.location = location || "";
    product.phone = phone || "";
    product.category = category;
    product.condition = condition;
    product.stock = parseInt(stock) || 0;
    product.unit = unit;
    product.tags = tags ? tags.split(",") : [];
    product.images = finalImages;

    await product.save();

    res.json({ message: "Product updated successfully.", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: error.message });
  }
};

