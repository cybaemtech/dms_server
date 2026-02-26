import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import NotificationPanel from "@/components/NotificationPanel";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userId?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

export default function DashboardLayout({
  children,
  userRole,
  userName,
  userId = "",
  notificationCount = 0,
  onLogout,
}: DashboardLayoutProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">DMS</h1>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm font-medium text-muted-foreground">{userRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {userId && <NotificationPanel userId={userId} />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-user-menu">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 md:px-6">{children}</main>
    </div>
  );
}
