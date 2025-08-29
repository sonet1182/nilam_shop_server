import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';
import userRoutes from './routes/userRoute.js';
import authRoute from './routes/authRoute.js';
import productRoutes from './routes/productRoutes.js';
import http from "http";
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/admin';

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

// Store bids in memory (or database)
let bidsByProduct = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinProductRoom", (productId) => {
        socket.join(productId);
        // Send existing bids to new user
        socket.emit("updateBids", bidsByProduct[productId] || []);
    });

    socket.on("placeBid", ({ productId, bid, user }) => {
        if (!bidsByProduct[productId]) bidsByProduct[productId] = [];
        bidsByProduct[productId].push({ ...bid, user });

        console.log('Current bids for product', productId, ':', bidsByProduct[productId]);

        // Broadcast new bids to all users in room
        io.to(productId).emit("updateBids", bidsByProduct[productId]);
    });

    socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from Express!" });
});

app.use('/api', userRoutes);
app.use('/api/auth', authRoute);
app.use("/api/products", productRoutes);
app.use("/uploads", express.static("uploads"));

// MongoDB connection and server start
mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => console.error('MongoDB connection error:', error));
