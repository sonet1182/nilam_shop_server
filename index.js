import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoute.js';
import authRoute from './routes/authRoute.js';
import productRoutes from './routes/productRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/admin';

// Middleware
app.use(bodyParser.json());

app.use('/api', userRoutes);
app.use('/api/auth', authRoute);
app.use("/api/products", productRoutes);
app.use("/uploads", express.static("uploads"));

// MongoDB connection and server start
mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => console.error('MongoDB connection error:', error));
