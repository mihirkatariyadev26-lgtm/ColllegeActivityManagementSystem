import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeNo: {
      type: Number,
      required: true,
      unique: true,
    },
    employeeType: {
      type: String,
      enum: ["Professor", "HOD", "Principal"],
      required: true,
    },
    department: {
      type: String,
      enum: [
        "Computer Science",
        "Information Technology",
        "Electronics and Communication",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Environmental Science Department",
        "Chemical Department",
        "Bio-Technology Department",
      ],
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
