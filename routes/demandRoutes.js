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
import demandModel from "../model/demandModel.js";
import demandBidModel from "../model/demandBidModel.js";

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


router.post("/:id/bids", upload.array("images", 5), async (req, res) => {
  console.log("req.files:", req.files);  // Add this
  console.log("req.body:", req.body);

  if (!req.files) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const { bid_price, note, user_id } = req.body;
  const productId = req.params.id;

  const imagePaths = req.files.map(f => `${f.filename}`);

  const newBid = await demandBidModel.create({
    productId,
    user: user_id,
    amount: bid_price,
    note,
    images: imagePaths,
  });

  const populatedBid = await newBid.populate("user", "name image");

  const bids = await demandBidModel
    .find({ productId })
    .sort({ amount: -1 })
    .populate("user", "name image _id");

  req.io.to(productId).emit("updateDemandBids", bids);

  res.json({ success: true, bid: populatedBid });
});



export default router;
