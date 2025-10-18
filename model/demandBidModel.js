import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    images: [
        {
            type: String,
            required: [true, "At least one image is required"],
        },
    ],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    note: {
        type: String,
        required: false,
    },
}, { timestamps: true });

export default mongoose.model("DemandBid", bidSchema);
