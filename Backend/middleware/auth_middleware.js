import jwt from "jsonwebtoken";
import { User } from "../models/user_model.js";

/**
 * verifyToken — Verifies the JWT from the cookie and attaches the decoded
 * user payload to req.user. Ensures department is always populated.
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // If department is missing from legacy tokens, fetch from DB
    if (!decoded.department) {
      const user = await User.findById(decoded.id).select("employeeType department employeeName");
      if (user) {
        decoded.department = user.department;
        decoded.employeeType = user.employeeType;
        decoded.employeeName = user.employeeName;
      }
    }
    req.user = decoded; // { id, employeeType, department, employeeName }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

/**
 * authorizeRoles — Factory that returns a middleware allowing only the
 * specified roles to proceed.
 *
 * Usage: authorizeRoles("Principal", "HOD")
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.employeeType)) {
      return res.status(403).json({
        message: `Access denied. Only ${roles.join(" or ")} can perform this action.`,
      });
    }
    next();
  };
};
