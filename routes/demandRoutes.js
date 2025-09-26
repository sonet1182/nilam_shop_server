import express from "express";
import multer from "multer";
import {
  create,
  index,
  view,
  update,
  destroy,
  productBids,
} from "../controller/demandController.js";
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

router.get("/", index);
router.get("/:id", view);
router.get("/shop/seller", index);
router.get("/:id/bids", productBids);

// Apply verifyToken only to routes below
router.use(verifyToken);
router.get("/shop/mine", index);
router.post("/", upload.array("images", 5), create);
router.put("/:id", update);
router.delete("/:id", destroy);

export default router;
