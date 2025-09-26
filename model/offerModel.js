import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    demandId: { type: mongoose.Schema.Types.ObjectId, ref: "Demand", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("Offer", offerSchema);
