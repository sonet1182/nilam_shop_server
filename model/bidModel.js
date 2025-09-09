import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("Bid", bidSchema);
