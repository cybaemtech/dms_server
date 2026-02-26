import DashboardLayout from "../DashboardLayout";

export default function DashboardLayoutExample() {
  return (
    <DashboardLayout
      userRole="Document Creator"
      userName="John Smith"
      notificationCount={3}
      onLogout={() => console.log("Logout clicked")}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard Content</h2>
        <p className="text-muted-foreground">
          This is the main content area of the dashboard.
        </p>
      </div>
    </DashboardLayout>
  );
}
