import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    image: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model("User", userSchema);