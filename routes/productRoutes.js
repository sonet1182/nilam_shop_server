import express from "express";
import multer from "multer";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  productBids,
} from "../controller/productController.js";
import { verifyToken } from "../controller/authController.js";

const router = express.Router();

// Public route (no middleware)
router.get("/public-info", (req, res) => {
  res.json({ message: "This route is public and needs no token" });
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    }
});

const upload = multer({ storage });

router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/shop/seller", getProducts);
router.get("/:id/bids", productBids);

// Apply verifyToken only to routes below
router.use(verifyToken);
router.get("/shop/mine", getProducts);
router.post("/", upload.array("images", 5), createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
