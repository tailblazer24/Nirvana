import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import connectDB from './config/db.js';
import sleepRoutes from './routes/sleep_routes.js';
import workoutRoutes from './routes/workout_routes.js';
import moodRoutes from './routes/mood_routes.js';

import authenticateSocket from './middlewares/authenticatesocket.js';
import setupChangeStreams from './utils/setupChangeStreams.js';

dotenv.config();

// Connect MongoDB
await connectDB();

const app = express();
const server = http.createServer(app);

// Setup socket.io
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*' }
});
io.use(authenticateSocket);
app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api/sleep', sleepRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/mood', moodRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'up' : 'down'
  });
});

// Mongo + Socket Setup
mongoose.connection.once('open', () => {
  const db = mongoose.connection.useDb('Self-Care-Data'); // optional if using sub-db
  setupChangeStreams(db, io);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.warn('SIGTERM received. Shutting down gracefully...');
  await mongoose.disconnect();
  server.close(() => process.exit(0));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
