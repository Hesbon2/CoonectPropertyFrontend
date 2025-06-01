import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectDB from './utils/db.js';
import config from './config.js';
import inquiryRoutes from './routes/inquiry.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: config.app.frontendUrl,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/inquiries', inquiryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: config.app.env === 'development' ? err.message : undefined
  });
});

const PORT = config.app.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 