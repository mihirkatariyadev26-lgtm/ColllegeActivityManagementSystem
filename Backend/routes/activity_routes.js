import { Router } from "express";
import {
  createActivity,
  createDailyBatch,
  updateActivity,
  getActivities,
  getDailySchedule,
  deleteActivity,
} from "../controller/activity_Controller.js";
import { verifyToken, authorizeRoles } from "../middleware/auth_middleware.js";

const activityRouter = Router();

// All routes require a valid JWT
activityRouter.use(verifyToken);

// ─── CREATE ───────────────────────────────────────────────────────────────────
// EOD Batch submission of all 6 activities in a day (Principal, HOD, Professor)
activityRouter.post(
  "/daily-batch",
  authorizeRoles("Principal", "HOD", "Professor"),
  createDailyBatch
);

// Create single activity (Principal creates any; Professors & HODs create Daily Activities)
activityRouter.post(
  "/",
  authorizeRoles("Principal", "HOD", "Professor"),
  createActivity
);

// ─── READ ─────────────────────────────────────────────────────────────────────
// All logged-in users can view activities
// GET /api/activities?facultyId=...&date=...&activityLevel=...
activityRouter.get("/", getActivities);

// GET /api/activities/schedule?facultyId=...&date=...
activityRouter.get("/schedule", getDailySchedule);

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// Principal → all levels | HOD → Department | Professor → Daily
// Role check is handled inside the controller based on the activity's level
activityRouter.put(
  "/:id",
  authorizeRoles("Principal", "HOD", "Professor"),
  updateActivity
);

// ─── DELETE ───────────────────────────────────────────────────────────────────
// Principal (College Activities only) & HOD (Department Activities only)
activityRouter.delete(
  "/:id",
  authorizeRoles("Principal", "HOD"),
  deleteActivity
);

export default activityRouter;
