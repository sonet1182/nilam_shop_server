import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
  },
  description: {
    type: String,
    required: [true, "Product description is required"],
  },
  images: [
    {
      type: String,
      required: [true, "At least one image is required"],
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bidStart: {
    type: Date,
    required: [true, "Bidding start time is required"],
  },
  bidEnd: {
    type: Date,
    required: [true, "Bidding end time is required"],
  },
  productType: {
    type: String,
    enum: ["delivery", "takeaway", "both"],
    default: "delivery",
  },
  deliveryCost: {
    type: Number,
    required: function () {
      return this.productType === "delivery" || this.productType === "both";
    },
  },
  location: {
    type: String,
    required: function () {
      return this.productType === "takeaway" || this.productType === "both";
    },
  },
  phone: {
    type: String,
    required: function () {
      return this.productType === "takeaway" || this.productType === "both";
    },
  },
  category: {
    type: String,
    default: "General",
  },
  condition: {
    type: String,
    enum: ["new", "used", "refurbished"],
    default: "new",
  },
  stock: {
    type: Number,
    default: 1,
    min: [0, "Stock cannot be negative"],
  },
  unit: {
    type: String,
    default: "piece",
  },
  tags: [String],
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
