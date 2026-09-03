import express from "express";
import { connectDB } from "./db.js";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/user_routes.js";
import activityRoutes from "./routes/activity_routes.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

// Trust reverse proxies (Render, Railway, Heroku, AWS ELB, etc.)
app.set("trust proxy", 1);

// Allowed origins for CORS in development and production
const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  ...clientUrls,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health check and root route for deployment monitors (Render, Railway, etc.)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).send("College Activity Management API is live and running.");
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);

app.listen(port, () => {
  connectDB();
  console.log(`Application is listening on ${port}`);
});
