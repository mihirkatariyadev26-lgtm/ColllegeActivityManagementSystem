// Seed script — Run with: node seed.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "./models/user_model.js";
import { Activity, DailySchedule } from "./models/activity_model.js";

dotenv.config();

const users = [
  {
    employeeName: "Dr. Rajesh Patel",
    employeeNo: 1001,
    employeeType: "Principal",
    department: "Computer Science",
    password: "principal123",
  },
  {
    employeeName: "Prof. Mihir Katariya",
    employeeNo: 2001,
    employeeType: "HOD",
    department: "Computer Science",
    password: "hod123",
  },
  {
    employeeName: "Prof. Ankit Sharma",
    employeeNo: 2002,
    employeeType: "HOD",
    department: "Information Technology",
    password: "hod123",
  },
  {
    employeeName: "Prof. Neha Joshi",
    employeeNo: 3001,
    employeeType: "Professor",
    department: "Computer Science",
    password: "prof123",
  },
  {
    employeeName: "Prof. Ravi Mehta",
    employeeNo: 3002,
    employeeType: "Professor",
    department: "Information Technology",
    password: "prof123",
  },
];

// Helper — today, yesterday, day before
function getDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Sample activities spread across 3 days, all 3 levels, multiple faculty
function buildActivities(userMap) {
  const principal = userMap.get(1001);
  const hodCS = userMap.get(2001);
  const hodIT = userMap.get(2002);
  const profNeha = userMap.get(3001);
  const profRavi = userMap.get(3002);

  return [
    // ── Today ─────────────────────────────────────────────────────────
    // College-level (Principal)
    { description: "Annual Day event planning meeting", activityDate: getDate(0), lectureNum: 1, activityLevel: "College Activity", faculty: principal },
    { description: "Reviewed campus infrastructure proposals", activityDate: getDate(0), lectureNum: 2, activityLevel: "College Activity", faculty: principal },

    // Department-level (HOD CS)
    { description: "CS Dept — Semester syllabus finalization", activityDate: getDate(0), lectureNum: 1, activityLevel: "Department Activity", faculty: hodCS },
    { description: "CS Dept — Lab equipment audit", activityDate: getDate(0), lectureNum: 2, activityLevel: "Department Activity", faculty: hodCS },
    { description: "CS Dept — Faculty workload distribution", activityDate: getDate(0), lectureNum: 3, activityLevel: "Department Activity", faculty: hodCS },

    // Department-level (HOD IT)
    { description: "IT Dept — Workshop on Cloud Computing", activityDate: getDate(0), lectureNum: 1, activityLevel: "Department Activity", faculty: hodIT },
    { description: "IT Dept — Student project reviews", activityDate: getDate(0), lectureNum: 2, activityLevel: "Department Activity", faculty: hodIT },

    // Daily (Prof Neha)
    { description: "Delivered AI & ML lecture — Unit 3", activityDate: getDate(0), lectureNum: 1, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Conducted Python lab session", activityDate: getDate(0), lectureNum: 2, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Student mentoring — project guidance", activityDate: getDate(0), lectureNum: 3, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Updated ERP attendance records", activityDate: getDate(0), lectureNum: 4, activityLevel: "Daily Activity", faculty: profNeha },

    // Daily (Prof Ravi)
    { description: "Delivered DBMS lecture — Normalization", activityDate: getDate(0), lectureNum: 1, activityLevel: "Daily Activity", faculty: profRavi },
    { description: "Conducted Web Dev practical session", activityDate: getDate(0), lectureNum: 2, activityLevel: "Daily Activity", faculty: profRavi },
    { description: "Prepared question bank for mid-sem exam", activityDate: getDate(0), lectureNum: 3, activityLevel: "Daily Activity", faculty: profRavi },

    // ── Yesterday ─────────────────────────────────────────────────────
    { description: "Chaired Board of Studies meeting", activityDate: getDate(-1), lectureNum: 1, activityLevel: "College Activity", faculty: principal },
    { description: "CS Dept — Internal hackathon coordination", activityDate: getDate(-1), lectureNum: 1, activityLevel: "Department Activity", faculty: hodCS },
    { description: "CS Dept — Research paper review session", activityDate: getDate(-1), lectureNum: 2, activityLevel: "Department Activity", faculty: hodCS },
    { description: "Delivered Data Structures lecture — Trees", activityDate: getDate(-1), lectureNum: 1, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Lab session — Binary Search Tree implementation", activityDate: getDate(-1), lectureNum: 2, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Delivered OS lecture — Process Scheduling", activityDate: getDate(-1), lectureNum: 1, activityLevel: "Daily Activity", faculty: profRavi },

    // ── Day before yesterday ──────────────────────────────────────────
    { description: "Accreditation documentation review", activityDate: getDate(-2), lectureNum: 1, activityLevel: "College Activity", faculty: principal },
    { description: "IT Dept — Curriculum revision meeting", activityDate: getDate(-2), lectureNum: 1, activityLevel: "Department Activity", faculty: hodIT },
    { description: "Delivered CN lecture — TCP/IP Model", activityDate: getDate(-2), lectureNum: 1, activityLevel: "Daily Activity", faculty: profNeha },
    { description: "Conducted Java programming lab", activityDate: getDate(-2), lectureNum: 2, activityLevel: "Daily Activity", faculty: profRavi },
    { description: "Submitted research paper to IEEE conference", activityDate: getDate(-2), lectureNum: 3, activityLevel: "Daily Activity", faculty: profRavi },
  ];
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Activity.deleteMany({});
    await DailySchedule.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Create users with hashed passwords
    const userMap = new Map();
    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const user = await User.create({ ...u, password: hashedPassword });
      userMap.set(u.employeeNo, user._id);
      console.log(`👤 Created ${u.employeeType}: ${u.employeeName} (EmpNo: ${u.employeeNo}, Password: ${u.password})`);
    }

    // Create activities and group into daily schedules
    const activityDefs = buildActivities(userMap);
    for (const def of activityDefs) {
      const activity = await Activity.create(def);

      const dayStart = new Date(def.activityDate);
      dayStart.setHours(0, 0, 0, 0);

      await DailySchedule.findOneAndUpdate(
        { faculty: def.faculty, scheduleDate: dayStart },
        { $push: { activities: activity._id } },
        { upsert: true, new: true },
      );
    }
    console.log(`📋 Created ${activityDefs.length} activities across 3 days`);

    console.log("\n════════════════════════════════════════════════");
    console.log("  🎉  SEED COMPLETE — Login credentials:");
    console.log("════════════════════════════════════════════════");
    console.log("  Principal : EmpNo 1001  | Password: principal123");
    console.log("  HOD (CS)  : EmpNo 2001  | Password: hod123");
    console.log("  HOD (IT)  : EmpNo 2002  | Password: hod123");
    console.log("  Professor : EmpNo 3001  | Password: prof123");
    console.log("  Professor : EmpNo 3002  | Password: prof123");
    console.log("════════════════════════════════════════════════\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
