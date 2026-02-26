import { Badge } from "@/components/ui/badge";

export type DocumentStatus = "Pending" | "Approved" | "Declined" | "Issued" | "Revised";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case "Pending":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "Approved":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "Declined":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "Issued":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "Revised":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Badge
      variant="outline"
      className={`${getStatusColor()} uppercase text-xs font-medium tracking-wide ${className}`}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {status}
    </Badge>
  );
}
