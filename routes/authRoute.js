import express from 'express';
import { getLoggedInUser, login, logout, register, sellerProfile, socialLogin, verifyToken } from '../controller/authController.js';

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/social-login", socialLogin);
router.post("/logout", verifyToken, logout); // Logout protected

router.get("/me", verifyToken, getLoggedInUser);

router.get("/seller/:id", sellerProfile); // Get seller profile by ID

export default router;