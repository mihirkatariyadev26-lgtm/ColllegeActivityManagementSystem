import mongoose from "mongoose";

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
