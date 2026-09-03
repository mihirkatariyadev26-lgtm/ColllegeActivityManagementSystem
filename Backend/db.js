import mongoose from "mongoose";
import dns from "node:dns";

// Use reliable public DNS for MongoDB Atlas SRV resolution
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log("Database Connected Successfully!");
  } catch (error) {
    console.error("Database connection error:", error.message);
  }
};

export { connectDB };
export default connectDB;
