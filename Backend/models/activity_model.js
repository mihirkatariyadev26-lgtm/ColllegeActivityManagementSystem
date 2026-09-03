import mongoose from "mongoose";

// Schema for an individual activity (1 out of 6 in a day)
const activitySchema = new mongoose.Schema({
  description: { 
    type: String, 
    required: true 
  },
  activityDate: { 
    type: Date, 
    required: true 
  },
  // lectureNum represents which of the 6 activities in a day this is
  lectureNum: { 
    type: Number, 
    min: 1, 
    max: 6, 
    required: true 
  },
  activityLevel: {
    type: String,
    enum: ["Daily Activity", "Department Activity", "College Activity"],
    required: true
  },
  // Reference to the faculty (User) performing the activity
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// Schema to group a full day's activities together for a specific faculty member
const dailyScheduleSchema = new mongoose.Schema({
  scheduleDate: {
    type: Date,
    required: true,
  },
  // Reference to the faculty (User) whose schedule this is
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Array of activity references (up to 6 per day)
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Activity"
  }]
}, { timestamps: true });

// Ensure that each faculty member only has one schedule per day
dailyScheduleSchema.index({ scheduleDate: 1, faculty: 1 }, { unique: true });

export const Activity = mongoose.model("Activity", activitySchema);
export const DailySchedule = mongoose.model("DailySchedule", dailyScheduleSchema);
