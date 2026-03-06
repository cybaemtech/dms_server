import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import CreatorDashboardWithAPI from "@/pages/CreatorDashboardWithAPI";
import ApproverDashboard from "@/pages/ApproverDashboard";
import IssuerDashboard from "@/pages/IssuerDashboard";
import RecipientDashboard from "@/pages/RecipientDashboard";
import CreateDocumentPage from "@/pages/CreateDocumentPage";
import AdminDashboard from "@/pages/AdminDashboard";
import NotificationPopup from "@/components/NotificationPopup";
import { Document } from "@/components/DocumentTable";

type UserRole = "Creator" | "Approver" | "Issuer" | "Recipient" | "Admin";

interface Activity {
  id: string;
  type: "created" | "approved" | "declined" | "issued" | "pending";
  docName: string;
  userName: string;
  timestamp: string;
  remarks?: string;
}

function Router() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Load session from localStorage on mount
  const savedSession = localStorage.getItem('userSession');
  const session = savedSession ? JSON.parse(savedSession) : null;

  const [isAuthenticated, setIsAuthenticated] = useState(!!session);
  const [userRole, setUserRole] = useState<UserRole | null>(session?.userRole || null);
  const [userName, setUserName] = useState<string>(session?.userName || "");
  const [userFullName, setUserFullName] = useState<string>(session?.userFullName || "");
  const [userLocationState, setUserLocationState] = useState<string>(session?.location || "");
  const [userId, setUserId] = useState<string>(session?.userId || "");
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(session?.departmentId || null);
  const [userDepartmentName, setUserDepartmentName] = useState<string | null>(session?.departmentName || null);

  // Update logic to ensure location is always synced
  useEffect(() => {
    if (session?.location && !userLocationState) {
      setUserLocationState(session.location);
    }
  }, [session, userLocationState]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [initialDocumentData, setInitialDocumentData] = useState<any>(null);

  // Restore navigation on mount if logged in
  useEffect(() => {
    if (session && isAuthenticated) {
      // Aggressively fetch latest user info if location is missing or for every session restore to be safe
      if (userId) {
        const fetchUserData = async () => {
          try {
            const response = await fetch(`/api/users/${userId}`);
            if (response.ok) {
              const userData = await response.json();
              if (userData.location) {
                setUserLocationState(userData.location);
                // Update local session to persist for next reload
                const updatedSession = { ...session, location: userData.location };
                localStorage.setItem('userSession', JSON.stringify(updatedSession));
              }
            }
          } catch (error) {
            console.error("Error refreshing user data:", error);
          }
        };
        fetchUserData();
      }

      switch (session.userRole) {
        case "Creator":
          setLocation("/creator");
          break;
        case "Approver":
          setLocation("/approver");
          break;
        case "Issuer":
          setLocation("/issuer");
          break;
        case "Recipient":
          setLocation("/recipient");
          break;
        case "Admin":
          setLocation("/admin");
          break;
      }
    }
  }, []);

  const handleLogin = async (data: { username: string; password: string }): Promise<boolean> => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        addNotification({
          type: "error",
          title: "Login Failed",
          message: error.message || "Invalid credentials. Please try again.",
        });
        return false;
      }

      const user = await response.json();

      const roleMap: Record<string, UserRole> = {
        "creator": "Creator",
        "approver": "Approver",
        "issuer": "Issuer",
        "recipient": "Recipient",
        "admin": "Admin"
      };

      const role = roleMap[user.role] || "Recipient";

      setUserRole(role);
      setUserName(user.username);
      setUserFullName(user.fullName);
      setUserLocationState(user.location || "");
      setUserId(user.id);
      setUserDepartmentId(user.departmentId || null);
      setUserDepartmentName(user.departmentName || null);
      setIsAuthenticated(true);

      // Save session to localStorage
      localStorage.setItem('userSession', JSON.stringify({
        userRole: role,
        userName: user.username,
        userFullName: user.fullName,
        userId: user.id,
        location: user.location,
        departmentId: user.departmentId || null,
        departmentName: user.departmentName || null
      }));

      // Navigate to appropriate dashboard
      switch (role) {
        case "Creator":
          setLocation("/creator");
          break;
        case "Approver":
          setLocation("/approver");
          break;
        case "Issuer":
          setLocation("/issuer");
          break;
        case "Recipient":
          setLocation("/recipient");
          break;
        case "Admin":
          setLocation("/admin");
          break;
      }

      // Show welcome notification
      addNotification({
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${user.fullName}!`,
      });
      return true;
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "Login Error",
        message: error.message || "An error occurred during login.",
      });
      return false;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName("");
    setUserLocationState("");
    setUserId("");
    setDocuments([]);
    setActivities([]);

    // Clear session from localStorage
    localStorage.removeItem('userSession');

    setLocation("/");
    addNotification({
      type: "info",
      title: "Logged Out",
      message: "You have been successfully logged out.",
    });
  };

  const addNotification = (notif: {
    type: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  }) => {
    const newNotif = {
      id: Date.now().toString(),
      ...notif,
    };
    setNotifications((prev) => [...prev, newNotif]);
  };

  const handleCreateDocument = (initialData?: any) => {
    // Store initial data in state or pass it through location state
    if (initialData) {
      setInitialDocumentData(initialData);
    }
    setLocation("/creator/create");
  };

  const handleDocumentSubmit = async (data: any) => {
    console.log("Document submitted:", data);

    try {
      if (!data.file) {
        addNotification({
          type: "error",
          title: "Error",
          message: "Word document file is required.",
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('docName', data.docName);
      formData.append('docNumber', data.docNumber);
      if (data.dateOfIssue) formData.append('dateOfIssue', data.dateOfIssue);
      formData.append('revisionNo', (parseInt(data.revisionNumber) || 0).toString());
      formData.append('preparedBy', userId);
      formData.append('status', 'pending');
      if (data.preparerName) formData.append('preparerName', data.preparerName);
      if (data.reasonForRevision) formData.append('reasonForRevision', data.reasonForRevision);
      if (data.duePeriodYears) formData.append('duePeriodYears', data.duePeriodYears);
      if (data.location) formData.append('location', data.location);
      if (data.departmentId) formData.append('departmentId', data.departmentId);
      if (data.dateOfRevision) formData.append('dateOfRev', data.dateOfRevision);
      if (data.reviewDueDate) formData.append('reviewDueDate', data.reviewDueDate);
      if (data.previousVersionId) formData.append('previousVersionId', data.previousVersionId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create document');
      }

      const createdDocument = await response.json();

      addNotification({
        type: "success",
        title: "Document Submitted",
        message: `${data.docName} has been submitted for approval. Header and footer extracted automatically.`,
      });

      // Invalidate queries to refresh the document list
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      setLocation("/creator");
    } catch (error: any) {
      console.error("Error submitting document:", error);
      addNotification({
        type: "error",
        title: "Error",
        message: error.message || "Failed to submit document. Please try again.",
      });
    }
  };

  const handleViewDocument = (doc: Document) => {
    console.log("Viewing document:", doc);
    addNotification({
      type: "info",
      title: "Document Opened",
      message: `Viewing ${doc.docName}`,
    });
  };

  const handleEditDocument = (docId: string, data: any) => {
    console.log("Editing document:", docId, data);

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
            ...doc,
            docName: data.docName,
            docNumber: data.docNumber,
            dateOfIssue: data.dateOfIssue,
            revisionNo: parseInt(data.revisionNumber) || 0,
            preparedBy: data.preparerName,
          }
          : doc
      )
    );

    // Add activity
    const document = documents.find(d => d.id === docId);
    if (document) {
      const newActivity: Activity = {
        id: Date.now().toString(),
        type: "created",
        docName: data.docName,
        userName: "You",
        timestamp: "Just now",
      };
      setActivities((prev) => [newActivity, ...prev]);
    }

    addNotification({
      type: "success",
      title: "Document Updated",
      message: `${data.docName} has been updated successfully.`,
    });
  };

  const handleDeleteDocument = (docId: string) => {
    const document = documents.find(d => d.id === docId);

    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));

    if (document) {
      addNotification({
        type: "info",
        title: "Document Deleted",
        message: `${document.docName} has been deleted.`,
      });
    }
  };

  const handleDownloadDocument = (doc: Document) => {
    console.log("Downloading document:", doc);
    addNotification({
      type: "success",
      title: "Download Started",
      message: `Downloading ${doc.docName}...`,
    });
  };

  return (
    <>
      <Switch>
        <Route path="/">
          <LoginPage onLogin={handleLogin} />
        </Route>
        <Route path="/creator">
          <CreatorDashboardWithAPI
            onCreateDocument={handleCreateDocument}
            onLogout={handleLogout}
            userId={userId}
            userName={userName}
            departmentId={userDepartmentId}
            departmentName={userDepartmentName}
          />
        </Route>
        <Route path="/creator/create">
          <CreateDocumentPage
            onBack={() => {
              setInitialDocumentData(null);
              setLocation("/creator");
            }}
            onSubmit={handleDocumentSubmit}
            onLogout={handleLogout}
            userName={userName}
            userFullName={userFullName}
            userLocation={userLocationState}
            initialData={initialDocumentData}
          />
        </Route>
        <Route path="/approver">
          <ApproverDashboard onLogout={handleLogout} userId={userId} approverName={userFullName} departmentId={userDepartmentId} departmentName={userDepartmentName} />
        </Route>
        <Route path="/issuer">
          <IssuerDashboard onLogout={handleLogout} userId={userId} issuerName={userFullName} departmentId={userDepartmentId} departmentName={userDepartmentName} />
        </Route>
        <Route path="/recipient">
          <RecipientDashboard onLogout={handleLogout} userId={userId} recipientName={userFullName} />
        </Route>
        <Route path="/admin">
          <AdminDashboard onLogout={handleLogout} userId={userId} />
        </Route>
        <Route component={NotFound} />
      </Switch>

      {notifications.map((notif) => (
        <NotificationPopup
          key={notif.id}
          notification={notif}
          onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        />
      ))}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
