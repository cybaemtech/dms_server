import StatusBadge from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-4 p-6">
      <StatusBadge status="Pending" />
      <StatusBadge status="Approved" />
      <StatusBadge status="Declined" />
      <StatusBadge status="Issued" />
      <StatusBadge status="Revised" />
    </div>
  );
}
