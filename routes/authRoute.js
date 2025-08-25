import express from 'express';
import { getLoggedInUser, login, logout, register, verifyToken } from '../controller/authController.js';

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken, logout); // Logout protected

router.get("/me", verifyToken, getLoggedInUser);

export default router;