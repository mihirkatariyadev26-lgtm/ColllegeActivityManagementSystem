import { User } from "../models/user_model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const register = async (req, res) => {
  try {
    const { employeeName, employeeNo, employeeType, department, password } = req.body;

    // Validate all required fields including password
    if (!employeeName || !employeeNo || !employeeType || !department || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ employeeNo });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password before saving — never store plain text passwords
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      employeeName,
      employeeNo,
      employeeType,
      department,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { employeeName, username, employeeNo, password } = req.body;

    const identifier = employeeName ?? username ?? employeeNo;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Employee name and password are required" });
    }

    const trimmedIdentifier = String(identifier).trim();
    const escaped = trimmedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let query;
    if (!isNaN(trimmedIdentifier) && trimmedIdentifier !== "") {
      query = {
        $or: [
          { employeeNo: Number(trimmedIdentifier) },
          { employeeName: { $regex: new RegExp(`^${escaped}$`, "i") } },
        ],
      };
    } else {
      query = {
        employeeName: { $regex: new RegExp(`^${escaped}$`, "i") },
      };
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Securely compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Sign a JWT token with role and department info
    const token = jwt.sign(
      {
        id: user._id,
        employeeType: user.employeeType,
        department: user.department,
        employeeName: user.employeeName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({
      message: "User logged in successfully",
      token,
      user: {
        id: user._id,
        employeeName: user.employeeName,
        employeeType: user.employeeType,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { register, login };

