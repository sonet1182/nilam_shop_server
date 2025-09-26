import mongoose from "mongoose";

const demandSchema = new mongoose.Schema({
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
  bidEnd: {
    type: Date,
    required: [true, "Bidding end time is required"],
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
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  categoryPath: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], // store parent hierarchy
  condition: {
    type: String,
    enum: ["new", "used", "refurbished"],
    default: "new",
  },
  quantity: {
    type: Number,
    default: 1,
    min: [0, "Stock cannot be negative"],
  },
  unit: {
    type: String,
    default: "piece",
  },
  tags: [String],
  highestOffer: {
    amount: { type: Number, default: 0 },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    biddingTime: { type: Date, default: null } // ⬅ Store the time of the highest bid
  },
  totalOffers: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Demand", demandSchema);
