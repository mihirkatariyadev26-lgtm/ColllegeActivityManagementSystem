function ActivityList({ activities = [], onEdit, onDelete, canEdit, canDelete }) {
  if (!activities.length) {
    return <p className="empty-state">No activities found.</p>;
  }

  return (
    <div className="items">
      {activities.map((activity) => (
        <div className="item" key={activity._id}>
          <div className="activity-summary">
            <p className="task-date">
              {new Date(activity.activityDate).toLocaleDateString()}
            </p>
            <p className="task-type">
              Lecture {activity.lectureNum} — {activity.activityLevel}
            </p>
            <p className="task-name">{activity.description}</p>
            {activity.faculty && (
              <p style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                {activity.faculty.employeeName} ({activity.faculty.department})
              </p>
            )}
          </div>
          <div className="btngrp">
            {canEdit && canEdit(activity) && (
              <button type="button" onClick={() => onEdit(activity)}>
                Edit
              </button>
            )}
            {canDelete && (typeof canDelete === "function" ? canDelete(activity) : canDelete) && (
              <button type="button" onClick={() => onDelete(activity._id)}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityList;
