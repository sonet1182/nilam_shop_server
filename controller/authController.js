import jwt from "jsonwebtoken";
import user from "../model/userModel.js";
import bcrypt from "bcryptjs";

// 🛠️ Helper: Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// 📝 REGISTER
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save user
        const newUser = new user({ name, email, password: hashedPassword });
        const savedUser = await newUser.save();

        // Generate token
        const token = generateToken(savedUser._id);

        return res.status(201).json({
            message: "User registered successfully.",
            success: true,
            status: 201,
            token,
            user: savedUser
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔑 LOGIN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const existingUser = await user.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found." });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password." });
        }

        // Generate token
        const token = generateToken(existingUser._id);

        return res.status(200).json({
            message: "Login successful.",
            success: true,
            status: 200,
            token,
            user: existingUser
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🚪 LOGOUT (Frontend will handle token removal, optional blacklist here)
let tokenBlacklist = [];

export const logout = (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        tokenBlacklist.push(token);
    }
    res.status(200).json({ message: "Logged out successfully." });
};

// 🛡️ Middleware to protect routes
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided." });

    if (tokenBlacklist.includes(token)) {
        return res.status(401).json({ message: "Token has been logged out." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token." });
        req.userId = decoded.id;
        next();
    });
};

export const getLoggedInUser = async (req, res) => {
  try {
    const userId = req.userId; // verifyToken middleware থেকে আসবে

    const existingUser = await user.findById(userId).select("-password -createdAt -updatedAt -__v"); // user ডাটাবেজ থেকে ইউজার তথ্য আনা হচ্ছে,
    // password ফিল্ড বাদ দিয়ে আনা হচ্ছে

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: "User fetched successfully",
      user: existingUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
