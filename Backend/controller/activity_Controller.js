import { Activity, DailySchedule } from "../models/activity_model.js";
import { User } from "../models/user_model.js";

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ACTIVITY
// Principal can create any activity.
// Teachers (Professors, HODs) can create Daily Activities.
// ─────────────────────────────────────────────────────────────────────────────
export const createActivity = async (req, res) => {
  try {
    const { description, activityDate, lectureNum, activityLevel, facultyId } = req.body;
    const { employeeType, id: userId } = req.user;

    // Validate required fields
    if (!description || !activityDate || !lectureNum || !activityLevel) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Role-based target faculty and level checks:
    let targetFaculty = userId;
    if (employeeType === "Principal") {
      if (activityLevel !== "College Activity" && activityLevel !== "Daily Activity") {
        return res.status(403).json({
          message: "Principal can only create College Activities or Daily Activities.",
        });
      }
      targetFaculty = activityLevel === "Daily Activity" ? userId : (facultyId || userId);
    } else if (employeeType === "HOD") {
      if (activityLevel !== "Department Activity" && activityLevel !== "Daily Activity") {
        return res.status(403).json({
          message: "HOD can only create Department Activities.",
        });
      }
      if (facultyId && facultyId !== userId.toString()) {
        const targetUser = await User.findById(facultyId);
        if (!targetUser || targetUser.department !== department) {
          return res.status(403).json({
            message: "HOD can only assign department activities to faculty in their department.",
          });
        }
        targetFaculty = facultyId;
      } else {
        targetFaculty = userId;
      }
    } else if (employeeType === "Professor") {
      if (activityLevel !== "Daily Activity") {
        return res.status(403).json({ message: "Professors can only create Daily Activities." });
      }
      targetFaculty = userId;
    }

    const dayStart = new Date(activityDate);
    dayStart.setHours(0, 0, 0, 0);

    // Check if the lecture slot is already taken for this faculty on this date
    const existingActivity = await Activity.findOne({
      faculty: targetFaculty,
      activityDate: dayStart,
      lectureNum,
    });

    if (existingActivity) {
      return res.status(409).json({
        message: `Lecture slot ${lectureNum} is already assigned for this date.`,
      });
    }

    const activity = new Activity({
      description,
      activityDate: dayStart,
      lectureNum,
      activityLevel,
      faculty: targetFaculty,
    });

    await activity.save();

    // Also push this activity into the faculty's DailySchedule for that date
    await DailySchedule.findOneAndUpdate(
      { faculty: targetFaculty, scheduleDate: dayStart },
      { $addToSet: { activities: activity._id } },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(201).json({
      message: "Activity created successfully.",
      activity,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / LOG DAILY ACTIVITIES IN BATCH (All 6 at once at EOD)
// Available to Principal, HOD, and Professors (logs for the authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
export const createDailyBatch = async (req, res) => {
  try {
    const { date, activities } = req.body;
    const { id: userId } = req.user;

    if (!date || !Array.isArray(activities)) {
      return res.status(400).json({ message: "Date and activities array are required." });
    }

    const targetFaculty = userId;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const savedActivityIds = [];
    const results = [];

    // Process all 6 slots
    for (let i = 0; i < Math.min(activities.length, 6); i++) {
      const lectureNum = i + 1;
      const rawItem = activities[i];
      const description = typeof rawItem === "string" ? rawItem.trim() : rawItem?.description?.trim();

      if (!description) continue; // skip empty slots

      // Upsert: if an activity already exists for this slot & date, update it; otherwise create it
      let act = await Activity.findOne({
        faculty: targetFaculty,
        activityDate: dayStart,
        lectureNum,
      });

      if (act) {
        act.description = description;
        act.activityLevel = "Daily Activity";
        await act.save();
      } else {
        act = new Activity({
          description,
          activityDate: dayStart,
          lectureNum,
          activityLevel: "Daily Activity",
          faculty: targetFaculty,
        });
        await act.save();
      }

      savedActivityIds.push(act._id);
      results.push(act);
    }

    if (savedActivityIds.length > 0) {
      await DailySchedule.findOneAndUpdate(
        { faculty: targetFaculty, scheduleDate: dayStart },
        { $addToSet: { activities: { $each: savedActivityIds } } },
        { upsert: true, returnDocument: "after" }
      );
    }

    return res.status(200).json({
      message: "Daily activities logged successfully.",
      count: results.length,
      activities: results,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ACTIVITY
// Access rules:
//   • Principal  → can modify any activity (all levels)
//   • HOD        → can only modify "Department Activity" of their own department
//   • Professor  → can only modify their own "Daily Activity"
// ─────────────────────────────────────────────────────────────────────────────
export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeType, department, id: userId } = req.user; // set by verifyToken middleware

    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found." });
    }

    // Role-based access check
    if (employeeType === "Principal") {
      if (activity.activityLevel === "Department Activity") {
        return res.status(403).json({
          message: "Principal cannot modify Department Activities.",
        });
      }
      if (activity.activityLevel === "Daily Activity" && activity.faculty.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Principal can only modify their own Daily Activities.",
        });
      }
    }

    if (employeeType === "HOD") {
      if (activity.activityLevel !== "Department Activity") {
        return res.status(403).json({
          message: "HOD can only modify Department Activities.",
        });
      }
      // HOD can only modify activities belonging to faculty in their department
      const activityFaculty = await User.findById(activity.faculty);
      if (!activityFaculty || activityFaculty.department !== department) {
        return res.status(403).json({
          message: "HOD can only modify Department Activities of their own department.",
        });
      }
    }

    if (employeeType === "Professor") {
      if (activity.activityLevel !== "Daily Activity") {
        return res.status(403).json({
          message: "Professor can only modify Daily Activities.",
        });
      }
      // Professor can ONLY modify their own Daily Activity
      if (activity.faculty.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Professors can only modify their own Daily Activities.",
        });
      }
    }

    // Fields allowed to be updated (activityLevel cannot be changed after creation)
    const { description, activityDate, lectureNum } = req.body;

    if (description) activity.description = description;
    if (activityDate) activity.activityDate = new Date(activityDate);
    if (lectureNum) {
      // Make sure the new slot isn't already occupied by another activity
      const slotTaken = await Activity.findOne({
        faculty: activity.faculty,
        activityDate: activity.activityDate,
        lectureNum,
        _id: { $ne: id }, // exclude the current activity itself
      });
      if (slotTaken) {
        return res.status(409).json({
          message: `Lecture slot ${lectureNum} is already taken for this faculty on that date.`,
        });
      }
      activity.lectureNum = lectureNum;
    }

    await activity.save();

    return res.status(200).json({
      message: "Activity updated successfully.",
      activity,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ACTIVITIES
// Visibility rules:
//   • Principal : sees all activities across the entire college
//   • HOD       : sees their own Daily, Department Activities of their dept ONLY, College Activities
//   • Professor : sees their own Daily ONLY, Department Activities of their dept ONLY, College Activities
// ─────────────────────────────────────────────────────────────────────────────
export const getActivities = async (req, res) => {
  try {
    const { facultyId, date, activityLevel } = req.query;
    const { employeeType, department, id: userId } = req.user;

    const filter = {};
    if (activityLevel) filter.activityLevel = activityLevel;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.activityDate = { $gte: dayStart, $lte: dayEnd };
    }

    // Role-based scoping
    if (employeeType === "Principal") {
      // Principal sees their own Daily Activities ONLY, plus all Department and College Activities
      filter.$or = [
        { activityLevel: "Daily Activity", faculty: userId },
        { activityLevel: "Department Activity" },
        { activityLevel: "College Activity" },
      ];
      if (facultyId) filter.faculty = facultyId;
    } else {
      // For Professor and HOD:
      // Find all faculty IDs belonging to this user's department
      const deptFacultyIds = await User.find({ department }).distinct("_id");

      if (employeeType === "Professor") {
        // Professor can see:
        // 1. Only their own Daily Activities
        // 2. Department Activities of their department only
        // 3. College-wide Activities
        filter.$or = [
          { activityLevel: "Daily Activity", faculty: userId },
          { activityLevel: "Department Activity", faculty: { $in: deptFacultyIds } },
          { activityLevel: "College Activity" },
        ];

        if (facultyId) {
          if (facultyId !== userId.toString()) {
            return res.status(403).json({ message: "Professors can only view their own activities." });
          }
          filter.faculty = facultyId;
        }
      } else if (employeeType === "HOD") {
        // HOD can see:
        // 1. Their own Daily Activities
        // 2. Department Activities of their department only
        // 3. College-wide Activities
        filter.$or = [
          { activityLevel: "Daily Activity", faculty: userId },
          { activityLevel: "Department Activity", faculty: { $in: deptFacultyIds } },
          { activityLevel: "College Activity" },
        ];

        if (facultyId) {
          // If filtering by facultyId, ensure it's in their department
          const isDeptFaculty = deptFacultyIds.some((id) => id.toString() === facultyId);
          if (!isDeptFaculty) {
            return res.status(403).json({ message: "HOD can only view activities of their own department." });
          }
          filter.faculty = facultyId;
        }
      }
    }

    const activities = await Activity.find(filter)
      .populate("faculty", "employeeName employeeNo employeeType department")
      .sort({ activityDate: 1, lectureNum: 1 });

    return res.status(200).json({ activities });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET A FACULTY'S DAILY SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
export const getDailySchedule = async (req, res) => {
  try {
    const { facultyId, date } = req.query;
    const { employeeType, department, id: userId } = req.user;

    if (!facultyId || !date) {
      return res.status(400).json({ message: "facultyId and date are required." });
    }

    // Role check: Professor can only see their own daily schedule
    if (employeeType === "Professor" && facultyId !== userId.toString()) {
      return res.status(403).json({ message: "Professors can only view their own daily schedule." });
    }

    // HOD can only see schedules of faculty in their department or their own
    if (employeeType === "HOD" && facultyId !== userId.toString()) {
      const targetUser = await User.findById(facultyId);
      if (!targetUser || targetUser.department !== department) {
        return res.status(403).json({ message: "HOD can only view schedules of their department's faculty." });
      }
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const schedule = await DailySchedule.findOne({
      faculty: facultyId,
      scheduleDate: dayStart,
    })
      .populate("faculty", "employeeName employeeNo employeeType department")
      .populate({
        path: "activities",
        options: { sort: { lectureNum: 1 } },
      });

    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for this faculty on that date." });
    }

    return res.status(200).json({ schedule });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ACTIVITY
// Rules:
//   • Principal: Can ONLY delete "College Activity" (NOT Daily Activities, NOT Department Activities)
//   • HOD: Can delete "Department Activity" belonging to their own department
//   • Professor / others: Cannot delete activities
// ─────────────────────────────────────────────────────────────────────────────
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeType, department } = req.user;

    const activity = await Activity.findById(id).populate("faculty", "department");
    if (!activity) {
      return res.status(404).json({ message: "Activity not found." });
    }

    // Role-based deletion permissions:
    if (employeeType === "Principal") {
      if (activity.activityLevel !== "College Activity") {
        return res.status(403).json({
          message: "Principal cannot delete Daily Activities or Department Activities. Principal can only delete College Activities.",
        });
      }
    } else if (employeeType === "HOD") {
      if (activity.activityLevel !== "Department Activity") {
        return res.status(403).json({
          message: "HOD can only delete Department Activities.",
        });
      }
      const actDept = activity.faculty?.department;
      if (actDept && actDept !== department) {
        return res.status(403).json({
          message: "HOD can only delete Department Activities of their own department.",
        });
      }
    } else {
      return res.status(403).json({
        message: "You do not have permission to delete activities.",
      });
    }

    await Activity.findByIdAndDelete(id);

    // Remove from the DailySchedule too
    const dayStart = new Date(activity.activityDate);
    dayStart.setHours(0, 0, 0, 0);

    await DailySchedule.findOneAndUpdate(
      { faculty: activity.faculty._id || activity.faculty, scheduleDate: dayStart },
      { $pull: { activities: activity._id } }
    );

    return res.status(200).json({ message: "Activity deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
