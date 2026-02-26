import ActivityFeed from "../ActivityFeed";

export default function ActivityFeedExample() {
  //todo: remove mock functionality
  const mockActivities = [
    {
      id: "1",
      type: "created" as const,
      docName: "Quality Control SOP",
      userName: "John Smith",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      type: "approved" as const,
      docName: "Safety Guidelines",
      userName: "Sarah Johnson",
      timestamp: "4 hours ago",
      remarks: "Looks good, approved for issuance",
    },
    {
      id: "3",
      type: "issued" as const,
      docName: "Production Format",
      userName: "Mike Davis",
      timestamp: "Yesterday",
    },
    {
      id: "4",
      type: "declined" as const,
      docName: "Equipment Checklist",
      userName: "Emma Wilson",
      timestamp: "2 days ago",
      remarks: "Please revise section 3.2",
    },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <ActivityFeed activities={mockActivities} />
    </div>
  );
}
