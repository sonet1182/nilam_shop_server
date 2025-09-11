import jwt from "jsonwebtoken";
import user from "../model/userModel.js";
import bcrypt from "bcryptjs";

// 🛠️ Helper: Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role ?? "user" }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// 📝 REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const randomValue = Math.floor(Math.random() * 101);
    const image = 'https://avatar.iran.liara.run/public/' + randomValue;

    // Save user
    const newUser = new user({ name, email, password: hashedPassword, image, role: role ?? "user" });
    const savedUser = await newUser.save();

    // Generate token
    const token = generateToken(savedUser);

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
    const token = generateToken(existingUser);

    res.cookie("token", token, {
      httpOnly: true,   // cannot be accessed by JS
      secure: process.env.NODE_ENV === "production", // only over HTTPS in prod
      sameSite: "lax",
      maxAge: parseInt(process.env.COOKIE_MAX_AGE, 10),
    });

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
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // must match the cookie's path
    maxAge: 0, // expire immediately
  });
  res.status(200).json({
    success: true,
    status: 200,
    message: "User Logged out successfully",
  });
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

// Auth middleware
export const isAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided. +" });

  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ message: "Token has been logged out." });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: "Invalid token." });
      // return decoded;
      if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden", decoded });
      req.userId = decoded.id;
      next();
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const getLoggedInUser = async (req, res) => {
  try {
    const userId = req.userId; // verifyToken middleware থেকে আসবে

    const existingUser = await user.findById(userId).select("-password -createdAt -updatedAt -__v"); // user ডাটাবেজ থেকে ইউজার তথ্য আনা হচ্ছে,
    // password ফিল্ড বাদ দিয়ে আনা হচ্ছে

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = {
      _id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      image: existingUser.image || null,
      role: existingUser.role
    };

    res.status(200).json({
      success: true,
      status: 200,
      message: "User fetched successfully",
      user: userData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Social login or register
export const socialLogin = async (req, res) => {
  try {
    const { name, email, image } = req.body;
    // providerId = id from Google/Facebook
    // provider = "google" / "facebook" etc.

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if user exists
    let existingUser = await user.findOne({ email });

    if (!existingUser) {
      const password = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Register new user
      existingUser = new user({
        name,
        email,
        image: image,
        password: hashedPassword
      });
      await existingUser.save();
    }

    // Generate JWT token
    const token = generateToken(existingUser);

    const userData = {
      _id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      image: existingUser.image || null,
      token: token || null
    };

    return res.status(200).json({
      message: "Login successful.",
      success: true,
      status: 200,
      user: userData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const sellerProfile = async (req, res) => {
  try {
    const userId = req.params.id; // verifyToken middleware থেকে আসবে

    const existingUser = await user.findById(userId).select("-password -createdAt -updatedAt -__v"); // user ডাটাবেজ থেকে ইউজার তথ্য আনা হচ্ছে,
    // password ফিল্ড বাদ দিয়ে আনা হচ্ছে

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = {
      _id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      image: existingUser.image || null,
    };

    res.status(200).json({
      success: true,
      status: 200,
      message: "Seller Data fetched successfully",
      data: userData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
