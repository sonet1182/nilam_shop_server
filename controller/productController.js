import Product from "../model/productModel.js";
import fs from "fs";
import path from "path";

// Multer দিয়ে প্রাপ্ত images ফাইল নাম বা path গুলো req.files থেকে পাবেন
export const createProduct = async (req, res) => {
    try {
        const { name, price, description } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "At least one image is required." });
        }

        // multer দিয়ে আপলোড করা ফাইলের ফাইলনেমের অ্যারে তৈরি
        const images = req.files.map(file => file.filename);

        const newProduct = new Product({
            name,
            price,
            description,
            images,
            createdBy: req.userId
        });

        const savedProduct = await newProduct.save();

        res.status(201).json({ message: "Product created", product: savedProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Get All Products
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ createdBy: req.userId }).populate("createdBy", "name email");;
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Get Single Product
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, createdBy: req.userId }).populate("createdBy", "name email").exec();
        if (!product) return res.status(404).json({ message: "Product not found" });

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Update Product
// Update product + optionally replace images
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, price, description } = req.body;

        const product = await Product.findOne({ _id: productId, createdBy: req.userId });
        if (!product) return res.status(404).json({ message: "Product not found" });

        // যদি নতুন images আসে, তাহলে পুরানো images ফাইল ডিলিট করুন (optional)
        if (req.files && req.files.length > 0) {
            // পুরানো images ফাইল ডিলিট করা
            product.images.forEach((img) => {
                const imgPath = path.join("uploads", img);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            });

            // নতুন images filenames সেভ করা
            product.images = req.files.map((file) => file.filename);
        }

        // অন্য ডাটা আপডেট করা
        if (name) product.name = name;
        if (price) product.price = price;
        if (description) product.description = description;

        const updatedProduct = await product.save();

        res.status(200).json({ message: "Product updated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Delete Product
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });
        if (!product) return res.status(404).json({ message: "Product not found" });

        product.images.forEach((img) => {
            const imgPath = path.join("uploads", img);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        });

        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
