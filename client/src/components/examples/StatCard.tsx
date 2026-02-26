import StatCard from "../StatCard";
import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <StatCard title="Total Documents" value={245} icon={FileText} trend="+12% from last month" />
      <StatCard title="Pending Approval" value={18} icon={Clock} trend="5 urgent" />
      <StatCard title="Issued" value={203} icon={CheckCircle} trend="This month: 23" />
      <StatCard title="Declined" value={24} icon={AlertCircle} />
    </div>
  );
}
