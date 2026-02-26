import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  variant?: 'blue' | 'amber' | 'green' | 'purple' | 'red';
}

export default function StatCard({ title, value, icon: Icon, trend, className, variant = 'blue' }: StatCardProps) {
  const variantStyles = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900',
  };

  const iconStyles = {
    blue: 'bg-blue-600',
    amber: 'bg-amber-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600',
  };

  return (
    <Card className={`p-4 ${className} border-2 ${variantStyles[variant]}`} data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
          <p className="text-2xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
          {trend && <p className="text-[10px] opacity-70">{trend}</p>}
        </div>
        <div className={`p-2 rounded-lg ${iconStyles[variant]} text-white`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
