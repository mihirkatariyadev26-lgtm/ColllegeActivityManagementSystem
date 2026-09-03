import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import ActivityList from "./ActivityList";
import { useAuth } from "../authcontex";
import {
  getActivities as fetchActivities,
  createActivity as createActivityAPI,
  createDailyBatch as createDailyBatchAPI,
  updateActivity as updateActivityAPI,
  deleteActivity as deleteActivityAPI,
} from "../api";

const dashboardOptions = [
  { value: "DailyDashboard", label: "Daily Activity" },
  { value: "DepartmentDashboard", label: "Department Activity" },
  { value: "CollegeDashboard", label: "College Activity" },
];

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.employeeName || "User";
  const userRole = user?.employeeType || "";

  const [dashboard, setDashboard] = useState("DailyDashboard");
  const [form, setForm] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchFromDate, setSearchFromDate] = useState("");
  const [searchToDate, setSearchToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  // Fetch activities from the backend
  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchActivities();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSearch = () => {
    setAppliedFromDate(searchFromDate);
    setAppliedToDate(searchToDate);
  };

  const matchesDateRange = (activityDate) => {
    const dateStr = activityDate?.split("T")[0] || "";
    if (!appliedFromDate && !appliedToDate) return true;
    if (appliedFromDate && dateStr < appliedFromDate) return false;
    if (appliedToDate && dateStr > appliedToDate) return false;
    return true;
  };

  const filteredActivities = activities.filter((activity) =>
    matchesDateRange(activity.activityDate),
  );

  const openCreateForm = () => {
    setEditTask(null);
    setForm("create");
  };

  const openEODForm = () => {
    setEditTask(null);
    setForm("eod");
  };

  const openEditForm = (task) => {
    setEditTask(task);
    setForm("edit");
  };

  const closeForm = () => {
    setForm(null);
    setEditTask(null);
  };

  const handleSaveBatch = async ({ date, activities }) => {
    try {
      await createDailyBatchAPI({
        date,
        activities,
        facultyId: user?.id,
      });
      closeForm();
      await loadActivities();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleSaveActivity = async (payload) => {
    try {
      if (form === "edit" && editTask) {
        await updateActivityAPI(editTask._id, payload);
      } else {
        await createActivityAPI({
          ...payload,
          facultyId: user.id,
        });
      }
      closeForm();
      await loadActivities(); // reload from backend
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await deleteActivityAPI(activityId);
      await loadActivities(); // reload from backend
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    logout();
    navigate("/", { replace: true });
  };

  // Role-based permission helpers
  const isPrincipal = userRole === "Principal";
  const isHOD = userRole === "HOD";
  const isProfessor = userRole === "Professor";
  const isFaculty = isProfessor || isHOD;
  const canCreate = isPrincipal || isHOD;
  const canEdit = (activity) => {
    if (activity.activityLevel === "Daily Activity") {
      const facultyId = activity.faculty?._id || activity.faculty;
      return String(facultyId) === String(user?.id);
    }

    if (activity.activityLevel === "Department Activity") {
      if (userRole === "Principal") return false; // Principal cannot modify Department Activities
      if (userRole === "HOD") {
        const actDept = activity.faculty?.department;
        return !actDept || actDept === user?.department;
      }
      return false;
    }

    if (activity.activityLevel === "College Activity") {
      return userRole === "Principal";
    }

    return false;
  };

  const canDelete = (activity) => {
    // Principal can ONLY delete College Activities (NOT Daily, NOT Department)
    if (userRole === "Principal") {
      return activity.activityLevel === "College Activity";
    }

    // HOD can delete Department Activities belonging to their department
    if (userRole === "HOD") {
      if (activity.activityLevel === "Department Activity") {
        const actDept = activity.faculty?.department;
        return !actDept || actDept === user?.department;
      }
      return false;
    }

    // Professors cannot delete activities
    return false;
  };

  return (
    <div id="dashboardPage">
      <div id="dashboard">
        <section id="Activity_Type_List">
          <section id="user">
            <section id="logo">
              <p id="profileLogo">{displayName.toUpperCase()[0]}</p>
            </section>
            <section id="name">
              <div>
                <p style={{ fontWeight: "700" }}>{displayName}</p>
                <p style={{ fontSize: "0.8rem", opacity: 0.85 }}>{userRole}</p>
                {user?.department && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      marginTop: "2px",
                    }}>
                    {user.department}
                  </p>
                )}
              </div>
            </section>
          </section>
          <section id="Options">
            <section id="Activity_type_Group">
              {dashboardOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    dashboard === option.value
                      ? "dashboard-button active"
                      : "dashboard-button"
                  }
                  onClick={() => setDashboard(option.value)}
                  aria-pressed={dashboard === option.value}>
                  {option.label}
                </button>
              ))}
            </section>
            <section
              id="Logout"
              onClick={handleLogout}
              style={{ cursor: "pointer" }}>
              <p>Logout</p>
            </section>
          </section>
        </section>
        <section id="Activity_List">
          <div className="dashboard-panel">
            <section id="top-bar">
              <section id="date-filter-bar">
                <label>
                  From :
                  <input
                    type="date"
                    value={searchFromDate}
                    onChange={(event) => setSearchFromDate(event.target.value)}
                  />
                </label>
                <label>
                  To :
                  <input
                    type="date"
                    value={searchToDate}
                    onChange={(event) => setSearchToDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="search-button"
                  onClick={handleSearch}>
                  Search
                </button>
              </section>
              <section id="left">
                <button
                  type="button"
                  className="Dashboard dashboard-action"
                  onClick={openEODForm}
                  style={{
                    backgroundColor: "#1b5e20",
                    color: "#ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}>
                  Log Daily (EOD 6 Slots)
                </button>
                {isHOD && (
                  <button
                    type="button"
                    className="Dashboard dashboard-action"
                    onClick={openCreateForm}
                    style={{
                      backgroundColor: "#0277bd",
                      color: "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}>
                    + Create Department Activity
                  </button>
                )}
                {isPrincipal && (
                  <button
                    type="button"
                    className="Dashboard dashboard-action"
                    onClick={openCreateForm}
                    style={{
                      backgroundColor: "#4527a0",
                      color: "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}>
                    + Create College Activity
                  </button>
                )}
              </section>
            </section>

            {error && (
              <p
                style={{
                  color: "#ff6b6b",
                  textAlign: "center",
                  padding: "0.5rem",
                  fontWeight: "600",
                }}>
                {error}
              </p>
            )}

            {form === "eod" ? (
              <DailyBatchForm
                existingActivities={activities}
                userId={user?.id}
                onClose={closeForm}
                onSubmit={handleSaveBatch}
              />
            ) : form ? (
              <ActivityForm
                mode={form}
                task={editTask}
                dashboard={dashboard}
                userRole={userRole}
                userDepartment={user?.department}
                onClose={closeForm}
                onSubmit={handleSaveActivity}
              />
            ) : isLoading ? (
              <section id="ActivityList">
                <p style={{ textAlign: "center", fontWeight: "600" }}>
                  Loading activities...
                </p>
              </section>
            ) : dashboard === "DepartmentDashboard" ? (
              <section
                id="ActivityList"
                style={{ padding: 0, overflow: "hidden", display: "block" }}>
                <DepartmentDashboardView
                  activities={filteredActivities}
                  userRole={userRole}
                  user={user}
                  onEdit={openEditForm}
                  onDelete={handleDeleteActivity}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onCreate={openCreateForm}
                />
              </section>
            ) : dashboard === "CollegeDashboard" ? (
              <section
                id="ActivityList"
                style={{ padding: 0, overflow: "hidden", display: "block" }}>
                <CollegeDashboardView
                  activities={filteredActivities}
                  userRole={userRole}
                  user={user}
                  onEdit={openEditForm}
                  onDelete={handleDeleteActivity}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onCreate={openCreateForm}
                />
              </section>
            ) : (
              <section id="ActivityList">
                <section id="List">
                  <div id="Daily-Activity-List">
                    <p
                      style={{
                        fontSize: "1.2rem",
                        textAlign: "center",
                        fontWeight: "700",
                      }}>
                      My Daily Activities
                    </p>
                    <ActivityList
                      activities={filteredActivities.filter(
                        (a) => a.activityLevel === "Daily Activity",
                      )}
                      onEdit={openEditForm}
                      onDelete={handleDeleteActivity}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  </div>
                  <div id="Department-Activity-List">
                    <p
                      style={{
                        fontSize: "1.2rem",
                        textAlign: "center",
                        fontWeight: "700",
                      }}>
                      {userRole === "Principal"
                        ? "Department Activities (All)"
                        : `Department Activities (${user?.department || "My Dept"})`}
                    </p>
                    <ActivityList
                      activities={filteredActivities.filter(
                        (a) => a.activityLevel === "Department Activity",
                      )}
                      onEdit={openEditForm}
                      onDelete={handleDeleteActivity}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  </div>
                  <div id="College-Activity-List">
                    <p
                      style={{
                        fontSize: "1.2rem",
                        textAlign: "center",
                        fontWeight: "700",
                      }}>
                      College Activities
                    </p>
                    <ActivityList
                      activities={filteredActivities.filter(
                        (a) => a.activityLevel === "College Activity",
                      )}
                      onEdit={openEditForm}
                      onDelete={handleDeleteActivity}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  </div>
                </section>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityForm({
  mode,
  task,
  dashboard,
  userRole,
  userDepartment,
  onClose,
  onSubmit,
}) {
  const getDefaultLevel = () => {
    if (task?.activityLevel) return task.activityLevel;
    if (userRole === "Principal") return "College Activity";
    if (userRole === "HOD") return "Department Activity";
    return "Daily Activity";
  };

  const [selectedDate, setSelectedDate] = useState(
    task?.activityDate?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState(task?.description ?? "");
  const [lectureNum, setLectureNum] = useState(task?.lectureNum ?? 1);
  const [activityLevel, setActivityLevel] = useState(getDefaultLevel);
  const [formError, setFormError] = useState("");

  const formTitle = () => {
    if (mode === "edit") return `Edit ${task?.activityLevel || "Activity"}`;
    return `Create ${activityLevel}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!description.trim()) {
      setFormError("Description is required");
      return;
    }

    try {
      await onSubmit({
        description,
        activityDate: selectedDate,
        lectureNum: Number(lectureNum),
        activityLevel,
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <section className="activity-form-container">
      <form className="activity-form" onSubmit={handleSubmit}>
        <div
          className="form-header"
          style={{
            position: "sticky",
            top: "-1.5rem",
            background: "white",
            paddingTop: "0.5rem",
            paddingBottom: "0.75rem",
            zIndex: 10,
            borderBottom: "1px solid #eee",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}>
          <h2
            style={{
              margin: 0,
              color: userRole === "Principal" ? "#4527a0" : "#0277bd",
            }}>
            {formTitle()}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}>
              Back
            </button>
            <button
              type="submit"
              className="form-submit"
              style={{
                minWidth: "auto",
                padding: "0.45rem 1.25rem",
                borderRadius: "0.5rem",
                backgroundColor:
                  userRole === "Principal" ? "#4527a0" : "#0277bd",
                color: "white",
                cursor: "pointer",
              }}>
              {mode === "edit" ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>

        <label htmlFor="activity-date">Select Date</label>
        <input
          id="activity-date"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          required
        />

        <label htmlFor="activity-level">Activity Level</label>
        <select
          id="activity-level"
          value={activityLevel}
          onChange={(event) => setActivityLevel(event.target.value)}
          disabled={mode === "edit"}
          style={{
            background: mode === "edit" ? "#f5f5f5" : "white",
            cursor: mode === "edit" ? "not-allowed" : "pointer",
            fontWeight: "600",
            padding: "0.45rem 0.8rem",
            borderRadius: "0.4rem",
            border: "1px solid #ccc",
          }}>
          {userRole === "Principal" && (
            <>
              <option value="College Activity">College Activity</option>
              <option value="Daily Activity">Daily Activity</option>
            </>
          )}
          {userRole === "HOD" && (
            <>
              <option value="Department Activity">Department Activity</option>
              <option value="Daily Activity">Daily Activity</option>
            </>
          )}
          {userRole === "Professor" && (
            <option value="Daily Activity">Daily Activity</option>
          )}
        </select>

        <label htmlFor="lecture-num">Lecture Number (1–6)</label>
        <input
          id="lecture-num"
          type="number"
          min={1}
          max={6}
          value={lectureNum}
          onChange={(event) => setLectureNum(event.target.value)}
          required
        />

        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={description}
          placeholder="Enter activity description"
          onChange={(event) => setDescription(event.target.value)}
          required
        />

        {formError && (
          <p style={{ color: "#ff6b6b", fontWeight: "600" }}>{formError}</p>
        )}

        <div
          className="form-actions"
          style={{
            position: "sticky",
            bottom: "-1.5rem",
            background: "white",
            paddingTop: "0.75rem",
            paddingBottom: "0.5rem",
            borderTop: "1px solid #eee",
            marginTop: "1rem",
            zIndex: 10,
          }}>
          <button type="button" className="secondary-button" onClick={onClose}>
            Back
          </button>
          <button
            type="submit"
            className="form-submit"
            style={{
              backgroundColor: "#1b5e20",
              color: "white",
              padding: "0.6rem 1.75rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}>
            {mode === "edit" ? "Save Changes" : "Create Activity"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DailyBatchForm({ existingActivities, userId, onClose, onSubmit }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [slots, setSlots] = useState(["", "", "", "", "", ""]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When date changes or activities load, prefill slots from existing daily activities
  useEffect(() => {
    const dayActs = (existingActivities || []).filter((a) => {
      const actDate = a.activityDate?.split("T")[0];
      const facultyId = a.faculty?._id || a.faculty;
      return (
        actDate === selectedDate &&
        a.activityLevel === "Daily Activity" &&
        String(facultyId) === String(userId)
      );
    });

    const newSlots = ["", "", "", "", "", ""];
    dayActs.forEach((act) => {
      if (act.lectureNum >= 1 && act.lectureNum <= 6) {
        newSlots[act.lectureNum - 1] = act.description || "";
      }
    });
    setSlots(newSlots);
  }, [selectedDate, existingActivities, userId]);

  const handleSlotChange = (index, value) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const hasAny = slots.some((s) => s.trim() !== "");
    if (!hasAny) {
      setFormError("Please enter a description for at least one lecture slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        date: selectedDate,
        activities: slots,
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="activity-form-container">
      <form
        className="activity-form"
        onSubmit={handleSubmit}
        style={{
          width: "min(96%, 52rem)",
          position: "relative",
        }}>
        {/* Top Header with title and quick submit */}
        <div
          className="form-header"
          style={{
            position: "sticky",
            top: "-1.5rem",
            background: "white",
            paddingTop: "0.5rem",
            paddingBottom: "0.75rem",
            zIndex: 10,
            borderBottom: "1px solid #eee",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", margin: 0, color: "#1b5e20" }}>
              Daily Activities EOD Entry
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#666",
                marginTop: "2px",
                margin: 0,
              }}>
              Fill in your 6 lecture slots. Existing entries will be updated.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{ minHeight: "2.3rem", padding: "0 1rem" }}>
              Back
            </button>
            <button
              type="submit"
              className="form-submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: "#1b5e20",
                color: "white",
                minHeight: "2.3rem",
                padding: "0 1.25rem",
                borderRadius: "0.5rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(27,94,32,0.3)",
              }}>
              {isSubmitting ? "Saving..." : " Submit EOD"}
            </button>
          </div>
        </div>

        {/* Date Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            margin: "0.4rem 0",
            background: "#f0f4f8",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
          }}>
          <label
            htmlFor="eod-date"
            style={{ fontWeight: "700", color: "#1a237e" }}>
            Activity Date:
          </label>
          <input
            id="eod-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "0.4rem",
              border: "1px solid #ccc",
              minHeight: "2.2rem",
            }}
            required
          />
        </div>

        {/* 2-Column Compact Grid for 6 slots */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
            gap: "0.65rem",
          }}>
          {slots.map((desc, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                background: "#fbfbfb",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.5rem",
                border: "1.5px solid #e0e6ed",
              }}>
              <label
                htmlFor={`slot-${idx + 1}`}
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  color: "#1b5e20",
                  display: "flex",
                  justifyContent: "space-between",
                }}>
                <span>Lecture {idx + 1}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    fontWeight: "normal",
                  }}>
                  Slot #{idx + 1}
                </span>
              </label>
              <input
                id={`slot-${idx + 1}`}
                type="text"
                placeholder={`Activity for Slot ${idx + 1} (e.g. Delivered Lecture)`}
                value={desc}
                onChange={(e) => handleSlotChange(idx, e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "2.2rem",
                  padding: "0.35rem 0.65rem",
                  border: "1px solid #ccc",
                  borderRadius: "0.35rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>

        {formError && (
          <p
            style={{ color: "#d32f2f", fontWeight: "600", margin: "0.4rem 0" }}>
            {formError}
          </p>
        )}

        {/* Bottom Actions Bar (Sticky) */}
        <div
          className="form-actions"
          style={{
            position: "sticky",
            bottom: "-1.5rem",
            background: "white",
            paddingTop: "0.75rem",
            paddingBottom: "0.5rem",
            borderTop: "1px solid #eee",
            marginTop: "0.75rem",
            zIndex: 10,
          }}>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="form-submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: "#1b5e20",
              color: "white",
              padding: "0.65rem 2rem",
              borderRadius: "0.5rem",
              fontWeight: "700",
              fontSize: "1.05rem",
              cursor: "pointer",
              boxShadow: "0 3px 8px rgba(27,94,32,0.35)",
            }}>
            {isSubmitting
              ? "Saving Activities..."
              : " Submit All 6 Activities (EOD)"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDICATED DEPARTMENT ACTIVITY DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────
function DepartmentDashboardView({
  activities,
  userRole,
  user,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  onCreate,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  const deptActivities = activities.filter(
    (a) => a.activityLevel === "Department Activity",
  );

  // Distinct departments in activities
  const availableDepts = Array.from(
    new Set(deptActivities.map((a) => a.faculty?.department).filter(Boolean)),
  ).sort();

  const filtered = deptActivities.filter((act) => {
    const actDept = act.faculty?.department || "";
    if (selectedDept !== "All" && actDept !== selectedDept) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = act.description?.toLowerCase().includes(q);
      const matchFac = act.faculty?.employeeName?.toLowerCase().includes(q);
      const matchDept = actDept.toLowerCase().includes(q);
      return matchDesc || matchFac || matchDept;
    }
    return true;
  });

  const isHOD = userRole === "HOD";
  const isPrincipal = userRole === "Principal";

  return (
    <div className="dedicated-dashboard">
      <div className="dedicated-dashboard-header">
        <div>
          <h2 className="dedicated-dashboard-title">
            {isPrincipal
              ? "Department Activities Dashboard (All Departments)"
              : `${user?.department || "Department"} Activities`}
          </h2>
          <p className="dedicated-dashboard-subtitle">
            {isPrincipal
              ? "Comprehensive overview of department-level sessions and programs across all college departments."
              : `Department-level academic sessions and activities for ${user?.department || "your department"}.`}
          </p>
        </div>
        {isHOD && (
          <button
            type="button"
            onClick={onCreate}
            style={{
              backgroundColor: "#0277bd",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.55rem 1.25rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(2,119,189,0.3)",
            }}>
            + Create Department Activity
          </button>
        )}
      </div>

      <div className="dedicated-dashboard-controls">
        <input
          type="text"
          className="dedicated-search-input"
          placeholder="Search by description, faculty, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isPrincipal && (
          <select
            className="dedicated-filter-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}>
            <option value="All">
              All Departments ({availableDepts.length})
            </option>
            {availableDepts.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}
        <span className="dedicated-stat-pill">
          {filtered.length} {filtered.length === 1 ? "Activity" : "Activities"}{" "}
          Found
        </span>
      </div>

      {filtered.length === 0 ? (
        <p
          className="empty-state"
          style={{ padding: "3rem 1rem", fontSize: "1.1rem" }}>
          No department activities found.
        </p>
      ) : (
        <div className="dedicated-cards-grid">
          {filtered.map((activity) => (
            <div className="dedicated-card" key={activity._id}>
              <div>
                <div className="dedicated-card-top">
                  <span
                    className="dedicated-card-badge"
                    style={{ backgroundColor: "#e1f5fe", color: "#0277bd" }}>
                    Slot #{activity.lectureNum}
                  </span>
                  <span className="dedicated-card-date">
                    {new Date(activity.activityDate).toLocaleDateString()}
                  </span>
                </div>
                <h4
                  className="dedicated-card-desc"
                  style={{ marginTop: "0.6rem" }}>
                  {activity.description}
                </h4>
              </div>

              <div className="dedicated-card-footer">
                <div className="dedicated-card-faculty">
                  {activity.faculty?.employeeName || "Faculty"}
                  {activity.faculty?.department && (
                    <span style={{ color: "#777", fontWeight: "normal" }}>
                      {" "}
                      • {activity.faculty.department}
                    </span>
                  )}
                </div>
                <div className="dedicated-card-actions">
                  {canEdit && canEdit(activity) && (
                    <button
                      type="button"
                      className="dedicated-btn-edit"
                      onClick={() => onEdit(activity)}>
                      Edit
                    </button>
                  )}
                  {canDelete && canDelete(activity) && (
                    <button
                      type="button"
                      className="dedicated-btn-delete"
                      onClick={() => onDelete(activity._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDICATED COLLEGE ACTIVITY DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CollegeDashboardView({
  activities,
  userRole,
  user,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  onCreate,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const collegeActivities = activities.filter(
    (a) => a.activityLevel === "College Activity",
  );

  const filtered = collegeActivities.filter((act) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = act.description?.toLowerCase().includes(q);
      const matchFac = act.faculty?.employeeName?.toLowerCase().includes(q);
      return matchDesc || matchFac;
    }
    return true;
  });

  const isPrincipal = userRole === "Principal";

  return (
    <div className="dedicated-dashboard">
      <div className="dedicated-dashboard-header">
        <div>
          <h2 className="dedicated-dashboard-title">
            College Activities & Events Dashboard
          </h2>
          <p className="dedicated-dashboard-subtitle">
            College-wide seminars, conferences, cultural fests, examinations,
            and administrative events.
          </p>
        </div>
        {isPrincipal && (
          <button
            type="button"
            onClick={onCreate}
            style={{
              backgroundColor: "#4527a0",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.55rem 1.25rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(69,39,160,0.3)",
            }}>
            + Create College Activity
          </button>
        )}
      </div>

      <div className="dedicated-dashboard-controls">
        <input
          type="text"
          className="dedicated-search-input"
          placeholder="Search by event description or organizer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span
          className="dedicated-stat-pill"
          style={{ backgroundColor: "#ede7f6", color: "#4527a0" }}>
          {filtered.length} {filtered.length === 1 ? "Event" : "Events"} Logged
        </span>
      </div>

      {filtered.length === 0 ? (
        <p
          className="empty-state"
          style={{ padding: "3rem 1rem", fontSize: "1.1rem" }}>
          No college activities found.
        </p>
      ) : (
        <div className="dedicated-cards-grid">
          {filtered.map((activity) => (
            <div
              className="dedicated-card"
              key={activity._id}
              style={{ borderLeft: "4px solid #4527a0" }}>
              <div>
                <div className="dedicated-card-top">
                  <span
                    className="dedicated-card-badge"
                    style={{ backgroundColor: "#ede7f6", color: "#4527a0" }}>
                    Slot #{activity.lectureNum} • College Wide
                  </span>
                  <span className="dedicated-card-date">
                    {new Date(activity.activityDate).toLocaleDateString()}
                  </span>
                </div>
                <h4
                  className="dedicated-card-desc"
                  style={{ marginTop: "0.6rem" }}>
                  {activity.description}
                </h4>
              </div>

              <div className="dedicated-card-footer">
                <div className="dedicated-card-faculty">
                  {activity.faculty?.employeeName || "Principal"} (
                  {activity.faculty?.employeeType || "Admin"})
                </div>
                <div className="dedicated-card-actions">
                  {canEdit && canEdit(activity) && (
                    <button
                      type="button"
                      className="dedicated-btn-edit"
                      onClick={() => onEdit(activity)}>
                      Edit
                    </button>
                  )}
                  {canDelete && canDelete(activity) && (
                    <button
                      type="button"
                      className="dedicated-btn-delete"
                      onClick={() => onDelete(activity._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
