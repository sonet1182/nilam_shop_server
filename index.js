import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';
import http from "http";
import { Server } from 'socket.io';
import socketHandler from './socket/socket.js';

import userRoutes from './routes/userRoute.js';
import adminUserRoutes from './routes/admin/userRoutes.js';
import adminDashboardRoutes from './routes/admin/dashboardRoutes.js';
import adminCategoryRoutes from './routes/admin/categoryRoutes.js';
import authRoute from './routes/authRoute.js';
import productRoutes from './routes/productRoutes.js';
import demandRoutes from './routes/demandRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { isAdmin } from './controller/authController.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const allowedOrigins = [
  "http://localhost:3000",            // local frontend
  "https://nilam-shop.onrender.com"   // deployed frontend
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Origin not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // important if using cookies or Authorization headers
}));


app.set("io", io);

// Initialize socket handler
socketHandler(io);

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Routes
app.get("/", (req, res) => res.send("Server is running 🚀"));
app.get("/api/hello", (req, res) => res.json({ message: "Hello from Express!" }));

app.use('/api', userRoutes);
app.use('/api/auth', authRoute);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/demands", (req, res, next) => {
    req.io = io; // attach io to req object
    next();
}, demandRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// Admin routes
app.use("/api/admin/users", isAdmin, adminUserRoutes);
app.use("/api/admin/dashboard", isAdmin, adminDashboardRoutes);
app.use("/api/admin/categories", isAdmin, adminCategoryRoutes);

// MongoDB connection and server start
const PORT = process.env.PORT || 7000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/admin';
// const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => console.error('MongoDB connection error:', error));
