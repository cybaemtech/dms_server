import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardLayout from "@/components/DashboardLayout";
import DocumentTable, { Document } from "@/components/DocumentTable";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  FileText, 
  Users, 
  Building2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send, 
  Download,
  TrendingUp,
  UserCheck,
  UserCog,
  Shield,
  BarChart3,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  UserPlus,
  Loader2,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Import department data
import departmentData from "../../../shared/departmentData.json";

interface AdminDashboardProps {
  onLogout?: () => void;
  userId?: string;
}

interface ApiDocument {
  id: string;
  docName: string;
  docNumber: string;
  status: string;
  dateOfIssue: string;
  revisionNo: number;
  preparedBy: string;
  preparerName?: string;
  approvedBy?: string;
  approverName?: string;
  issuedBy?: string;
  issuerName?: string;
  approvedAt?: string;
  issuedAt?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  issueRemarks?: string;
  previousVersionId?: string;
  createdAt?: string;
  departments?: Array<{ id: string; name: string }>;
}

interface AdminStats {
  documents: {
    total: number;
    pending: number;
    approved: number;
    issued: number;
    declined: number;
    recentCount: number;
  };
  users: {
    creators: number;
    approvers: number;
    issuers: number;
    total: number;
  };
  departments: {
    total: number;
    list: Array<{ id: string; name: string; code: string }>;
  };
  weeklyActivity: Array<{ day: string; documents: number }>;
  recentDocuments: Array<{
    id: string;
    docName: string;
    docNumber: string;
    status: string;
    createdAt?: string;
  }>;
}

interface AdminUsers {
  creators: Array<{ id: string; username: string; fullName: string; role: string }>;
  approvers: Array<{ id: string; username: string; fullName: string; role: string }>;
  issuers: Array<{ id: string; username: string; fullName: string; role: string }>;
  admins: Array<{ id: string; username: string; fullName: string; role: string }>;
  recipients: Array<{ id: string; username: string; fullName: string; role: string }>;
  total: number;
}

interface DynamicDepartment {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface AdminDocuments {
  documents: ApiDocument[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    issued: number;
    declined: number;
  };
}

const userFormSchema = z.object({
  username: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(3, "Password must be at least 3 characters"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["creator", "approver", "issuer", "admin", "recipient"]),
  masterCopyAccess: z.boolean().default(false),
});

const departmentFormSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Department code is required").max(10, "Code must be 10 characters or less"),
});

type UserFormValues = z.infer<typeof userFormSchema>;
type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))'];

function StatCardAnimated({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color,
  delay = 0 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  trend?: string;
  trendUp?: boolean;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ delay }}
    >
      <Card className="p-6 relative overflow-visible" data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <motion.p 
              className="text-3xl font-bold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2 }}
              data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {value}
            </motion.p>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trendUp !== undefined && (
                  trendUp ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )
                )}
                <span className={trendUp ? "text-green-600 dark:text-green-400" : trendUp === false ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <motion.div 
            className={`p-3 rounded-xl ${color}`}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
        </div>
        <motion.div 
          className={`absolute bottom-0 left-0 h-1 ${color}`}
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: delay + 0.3, duration: 0.5 }}
          style={{ borderRadius: "0 0 0 var(--radius)" }}
        />
      </Card>
    </motion.div>
  );
}

function DetailedDocumentCard({ doc, onView }: { doc: ApiDocument; onView: (doc: Document) => void }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-500/10 text-amber-600';
      case 'approved': return 'bg-blue-500/10 text-blue-600';
      case 'issued': return 'bg-green-500/10 text-green-600';
      case 'declined': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getCurrentStage = () => {
    switch (doc.status.toLowerCase()) {
      case 'pending':
        return doc.approvedBy ? 'Awaiting Issue (Issuer)' : 'Awaiting Approval (Approver)';
      case 'approved':
        return 'Awaiting Issue (Issuer)';
      case 'issued':
        return 'Document Issued';
      case 'declined':
        return 'Document Declined';
      default:
        return 'Unknown Stage';
    }
  };

  const getActionUser = () => {
    if (doc.status.toLowerCase() === 'declined') {
      return doc.approverName || 'Unknown User';
    }
    if (doc.status.toLowerCase() === 'issued') {
      return doc.issuerName || 'Unknown User';
    }
    if (doc.status.toLowerCase() === 'approved') {
      return doc.approverName || 'Unknown User';
    }
    return null;
  };

  const getRemarks = () => {
    if (doc.status.toLowerCase() === 'declined') {
      return doc.declineRemarks;
    }
    if (doc.status.toLowerCase() === 'issued') {
      return doc.issueRemarks;
    }
    if (doc.status.toLowerCase() === 'approved') {
      return doc.approvalRemarks;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-card hover-elevate"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">{doc.docName}</h4>
            <Badge variant="outline" className={getStatusColor(doc.status)}>
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-1">{doc.docNumber}</p>
          <p className="text-xs text-muted-foreground">Rev {doc.revisionNo} • Prepared by {doc.preparerName}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onView({
            id: doc.id,
            docName: doc.docName,
            docNumber: doc.docNumber,
            status: doc.status.charAt(0).toUpperCase() + doc.status.slice(1) as "Pending" | "Approved" | "Declined" | "Issued",
            dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
            revisionNo: doc.revisionNo,
            preparedBy: doc.preparerName || 'Unknown'
          })}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3 h-3 text-blue-500" />
          <span className="font-medium">Current Stage:</span>
          <span className="text-muted-foreground">{getCurrentStage()}</span>
        </div>
        
        {getActionUser() && (
          <div className="flex items-center gap-2 text-xs">
            <Users className="w-3 h-3 text-green-500" />
            <span className="font-medium">Action By:</span>
            <span className="text-muted-foreground">{getActionUser()}</span>
            {doc.status.toLowerCase() === 'declined' && (
              <Badge variant="destructive" className="text-xs px-1 py-0">Declined</Badge>
            )}
          </div>
        )}
        
        {getRemarks() && (
          <div className="mt-2 p-2 rounded bg-muted/30">
            <p className="text-xs font-medium text-foreground mb-1">Review Comments:</p>
            <p className="text-xs text-muted-foreground italic">"{getRemarks()}"</p>
          </div>
        )}
        
        {doc.departments && doc.departments.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium">Departments:</span>
            {doc.departments.slice(0, 3).map((dept, index) => (
              <Badge key={dept.id} variant="outline" className="text-xs px-1 py-0">
                {dept.name}
              </Badge>
            ))}
            {doc.departments.length > 3 && (
              <span className="text-xs text-muted-foreground">+{doc.departments.length - 3} more</span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>Created: {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown'}</span>
          {doc.approvedAt && (
            <span>Approved: {new Date(doc.approvedAt).toLocaleDateString()}</span>
          )}
          {doc.issuedAt && (
            <span>Issued: {new Date(doc.issuedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function UserCard({ user, role, index, onDelete }: { 
  user: { id: string; fullName: string; username: string }; 
  role: string; 
  index: number;
  onDelete: (userId: string) => void;
}) {
  const roleColors: Record<string, string> = {
    creator: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    approver: "bg-green-500/10 text-green-600 dark:text-green-400",
    issuer: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    admin: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    recipient: "bg-gray-500/10 text-gray-600 dark:text-gray-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover-elevate"
      data-testid={`user-card-${user.id}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={roleColors[role]}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(user.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard({ onLogout, userId = "admin-1" }: AdminDashboardProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Form configurations
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "creator",
      masterCopyAccess: false,
    },
  });

  const deptForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<AdminUsers>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 30000,
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery<AdminDocuments>({
    queryKey: ["/api/admin/documents"],
    refetchInterval: 5000,
  });

  // Query for dynamic departments (ones that can be deleted)
  const { data: dynamicDepartments, isLoading: departmentsLoading } = useQuery<DynamicDepartment[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/departments");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setUserDialogOpen(false);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (data: DepartmentFormValues) => {
      const response = await apiRequest("POST", "/api/departments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Department Created",
        description: "New department has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setDeptDialogOpen(false);
      deptForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create department.",
        variant: "destructive",
      });
    },
  });

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
    setViewDialogOpen(true);
  };

  const handleExportLogs = () => {
    toast({
      title: "Export Started",
      description: "Your document logs are being exported to Excel...",
    });
  };

  const onUserSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  const onDeptSubmit = (data: DepartmentFormValues) => {
    createDeptMutation.mutate(data);
  };

  // Delete mutations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Attempting to delete user:', userId);
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('User deleted successfully:', variables);
      toast({
        title: "User Deleted",
        description: "User has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error, variables) => {
      console.error('Delete user error:', error, 'for user:', variables);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (deptId: string) => {
      console.log('Attempting to delete department:', deptId);
      const response = await apiRequest("DELETE", `/api/departments/${deptId}`);
      if (!response.ok) {
        throw new Error(`Failed to delete department: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('Department deleted successfully:', variables);
      toast({
        title: "Department Deleted",
        description: "Department has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
    },
    onError: (error: Error, variables) => {
      console.error('Delete department error:', error, 'for department:', variables);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm(`Are you sure you want to delete this user? This action cannot be undone.`)) {
      console.log('User confirmed deletion for user:', userId);
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteDept = (deptId: string) => {
    if (confirm(`Are you sure you want to delete this department? This action cannot be undone.`)) {
      console.log('User confirmed deletion for department:', deptId);
      deleteDeptMutation.mutate(deptId);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const transformDocuments = (docs: ApiDocument[]): Document[] => {
    return docs.map((doc) => ({
      id: doc.id,
      docName: doc.docName,
      docNumber: doc.docNumber,
      status: doc.status.charAt(0).toUpperCase() + doc.status.slice(1) as "Pending" | "Approved" | "Declined" | "Issued",
      dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split("T")[0] : "",
      revisionNo: doc.revisionNo,
      preparedBy: doc.preparerName || "Unknown",
    }));
  };

  const pieData = stats ? [
    { name: 'Pending', value: stats.documents.pending },
    { name: 'Approved', value: stats.documents.approved },
    { name: 'Issued', value: stats.documents.issued },
    { name: 'Declined', value: stats.documents.declined },
  ].filter(d => d.value > 0) : [];

  const pendingDocs = documentsData?.documents.filter(d => d.status === "pending") || [];
  const approvedDocs = documentsData?.documents.filter(d => d.status === "approved") || [];
  const issuedDocs = documentsData?.documents.filter(d => d.status === "issued") || [];
  const declinedDocs = documentsData?.documents.filter(d => d.status === "declined") || [];

  return (
    <DashboardLayout
      userRole="Administrator"
      userName="Admin User"
      userId={userId}
      notificationCount={0}
      onLogout={onLogout}
    >
      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete system oversight with real-time analytics
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleExportLogs} data-testid="button-export-logs">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          <StatCardAnimated
            title="Total Documents"
            value={stats?.documents.total || 0}
            icon={FileText}
            trend={`${stats?.documents.recentCount || 0} this month`}
            trendUp={true}
            color="bg-primary"
            delay={0}
          />
          <StatCardAnimated
            title="Pending Approval"
            value={stats?.documents.pending || 0}
            icon={Clock}
            trend="Awaiting review"
            color="bg-amber-500"
            delay={0.1}
          />
          <StatCardAnimated
            title="Issued Documents"
            value={stats?.documents.issued || 0}
            icon={CheckCircle}
            trend="Active in system"
            trendUp={true}
            color="bg-green-500"
            delay={0.2}
          />
          <StatCardAnimated
            title="Total Users"
            value={stats?.users.total || 0}
            icon={Users}
            trend={`${stats?.departments.total || 0} departments`}
            color="bg-purple-500"
            delay={0.3}
          />
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div variants={itemVariants}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building2 className="w-4 h-4" />
                Departments
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <TabsContent value="overview" className="mt-6">
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <Card className="p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Weekly Activity</h3>
                      <p className="text-sm text-muted-foreground">Documents processed this week</p>
                    </div>
                    <Activity className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.weeklyActivity || []}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="documents" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          animationDuration={1000}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Document Status</h3>
                      <p className="text-sm text-muted-foreground">Distribution overview</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          animationDuration={1000}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Recent Documents</h3>
                      <p className="text-sm text-muted-foreground">Latest activity in the system</p>
                    </div>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {stats?.recentDocuments.map((doc, index) => (
                        <motion.div
                          key={`recent-${doc.id || index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover-elevate"
                          data-testid={`recent-doc-${doc.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.docName}</p>
                              <p className="text-xs text-muted-foreground">{doc.docNumber}</p>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary"
                            className={
                              doc.status === 'issued' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                              doc.status === 'approved' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                              doc.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              'bg-red-500/10 text-red-600 dark:text-red-400'
                            }
                          >
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </Badge>
                        </motion.div>
                      ))}
                      {(!stats?.recentDocuments || stats.recentDocuments.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No recent documents</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">User Breakdown</h3>
                      <p className="text-sm text-muted-foreground">By role type</p>
                    </div>
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Creators</span>
                        </div>
                        <span className="font-medium">{stats?.users.creators || 0}</span>
                      </div>
                      <Progress value={(stats?.users.creators || 0) / (stats?.users.total || 1) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Approvers</span>
                        </div>
                        <span className="font-medium">{stats?.users.approvers || 0}</span>
                      </div>
                      <Progress value={(stats?.users.approvers || 0) / (stats?.users.total || 1) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">Issuers</span>
                        </div>
                        <span className="font-medium">{stats?.users.issuers || 0}</span>
                      </div>
                      <Progress value={(stats?.users.issuers || 0) / (stats?.users.total || 1) * 100} className="h-2" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <motion.div
                key="documents"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <h3 className="text-lg font-semibold">All Documents</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{documentsData?.stats.total || 0} Total</Badge>
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{documentsData?.stats.pending || 0} Pending</Badge>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">{documentsData?.stats.issued || 0} Issued</Badge>
                    </div>
                  </div>

                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="all">All ({documentsData?.documents.length || 0})</TabsTrigger>
                      <TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger>
                      <TabsTrigger value="approved">Approved ({approvedDocs.length})</TabsTrigger>
                      <TabsTrigger value="issued">Issued ({issuedDocs.length})</TabsTrigger>
                      <TabsTrigger value="declined">Declined ({declinedDocs.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-6">
                      {documentsLoading ? (
                        <div className="border rounded-lg p-12 text-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Activity className="w-8 h-8 mx-auto text-muted-foreground" />
                          </motion.div>
                          <p className="text-sm text-muted-foreground mt-4">Loading documents...</p>
                        </div>
                      ) : documentsData?.documents && documentsData.documents.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm" data-testid="table-admin-documents">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-3 font-medium">Doc Number</th>
                                <th className="text-left p-3 font-medium">Document Name</th>
                                <th className="text-left p-3 font-medium">Rev</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Preparer</th>
                                <th className="text-left p-3 font-medium">Date of Issue</th>
                                <th className="text-left p-3 font-medium">Departments</th>
                                <th className="text-left p-3 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentsData.documents.map((doc, index) => (
                                <tr 
                                  key={`doc-${doc.id || index}`} 
                                  className="border-b hover:bg-muted/30 transition-colors"
                                  data-testid={`row-document-${doc.id}`}
                                >
                                  <td className="p-3 font-mono text-xs">{doc.docNumber}</td>
                                  <td className="p-3">{doc.docName}</td>
                                  <td className="p-3 text-center">{doc.revisionNo}</td>
                                  <td className="p-3">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        doc.status.toLowerCase() === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                                        doc.status.toLowerCase() === 'approved' ? 'bg-blue-500/10 text-blue-600' :
                                        doc.status.toLowerCase() === 'issued' ? 'bg-green-500/10 text-green-600' :
                                        doc.status.toLowerCase() === 'declined' ? 'bg-red-500/10 text-red-600' :
                                        'bg-gray-500/10 text-gray-600'
                                      }
                                    >
                                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                    </Badge>
                                  </td>
                                  <td className="p-3">{doc.preparerName || 'Unknown'}</td>
                                  <td className="p-3">{doc.dateOfIssue ? new Date(doc.dateOfIssue).toLocaleDateString() : '-'}</td>
                                  <td className="p-3">
                                    {doc.departments && doc.departments.length > 0 ? (
                                      <span className="text-xs text-muted-foreground">
                                        {doc.departments.slice(0, 2).map(d => d.name).join(', ')}
                                        {doc.departments.length > 2 && ` +${doc.departments.length - 2}`}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="p-3">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleView({
                                        id: doc.id,
                                        docName: doc.docName,
                                        docNumber: doc.docNumber,
                                        status: doc.status.charAt(0).toUpperCase() + doc.status.slice(1) as "Pending" | "Approved" | "Declined" | "Issued",
                                        dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
                                        revisionNo: doc.revisionNo,
                                        preparedBy: doc.preparerName || 'Unknown'
                                      })}
                                      data-testid={`button-view-${doc.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-12 text-center">
                          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">No documents in the system</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="pending" className="mt-6">
                      {pendingDocs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <h4 className="font-medium text-amber-800 dark:text-amber-200">Pending Documents Workflow</h4>
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-300">Documents waiting for approval or issue.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left p-3 font-medium">Doc Number</th>
                                  <th className="text-left p-3 font-medium">Document Name</th>
                                  <th className="text-left p-3 font-medium">Rev</th>
                                  <th className="text-left p-3 font-medium">Preparer</th>
                                  <th className="text-left p-3 font-medium">Date of Issue</th>
                                  <th className="text-left p-3 font-medium">Departments</th>
                                  <th className="text-left p-3 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pendingDocs.map((doc, index) => (
                                  <tr key={`pending-${doc.id || index}`} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-mono text-xs">{doc.docNumber}</td>
                                    <td className="p-3">{doc.docName}</td>
                                    <td className="p-3 text-center">{doc.revisionNo}</td>
                                    <td className="p-3">{doc.preparerName || 'Unknown'}</td>
                                    <td className="p-3">{doc.dateOfIssue ? new Date(doc.dateOfIssue).toLocaleDateString() : '-'}</td>
                                    <td className="p-3">
                                      {doc.departments && doc.departments.length > 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          {doc.departments.slice(0, 2).map(d => d.name).join(', ')}
                                          {doc.departments.length > 2 && ` +${doc.departments.length - 2}`}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="p-3">
                                      <Button size="sm" variant="ghost" onClick={() => handleView({
                                        id: doc.id, docName: doc.docName, docNumber: doc.docNumber,
                                        status: "Pending", dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
                                        revisionNo: doc.revisionNo, preparedBy: doc.preparerName || 'Unknown'
                                      })}><Eye className="w-4 h-4" /></Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-12 text-center">
                          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">No pending documents</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="approved" className="mt-6">
                      {approvedDocs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                              <h4 className="font-medium text-blue-800 dark:text-blue-200">Approved Documents</h4>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Documents approved and waiting for issue.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left p-3 font-medium">Doc Number</th>
                                  <th className="text-left p-3 font-medium">Document Name</th>
                                  <th className="text-left p-3 font-medium">Rev</th>
                                  <th className="text-left p-3 font-medium">Preparer</th>
                                  <th className="text-left p-3 font-medium">Approver</th>
                                  <th className="text-left p-3 font-medium">Approved At</th>
                                  <th className="text-left p-3 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {approvedDocs.map((doc, index) => (
                                  <tr key={`approved-${doc.id || index}`} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-mono text-xs">{doc.docNumber}</td>
                                    <td className="p-3">{doc.docName}</td>
                                    <td className="p-3 text-center">{doc.revisionNo}</td>
                                    <td className="p-3">{doc.preparerName || 'Unknown'}</td>
                                    <td className="p-3">{doc.approverName || '-'}</td>
                                    <td className="p-3">{doc.approvedAt ? new Date(doc.approvedAt).toLocaleDateString() : '-'}</td>
                                    <td className="p-3">
                                      <Button size="sm" variant="ghost" onClick={() => handleView({
                                        id: doc.id, docName: doc.docName, docNumber: doc.docNumber,
                                        status: "Approved", dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
                                        revisionNo: doc.revisionNo, preparedBy: doc.preparerName || 'Unknown'
                                      })}><Eye className="w-4 h-4" /></Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-12 text-center">
                          <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">No approved documents</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="issued" className="mt-6">
                      {issuedDocs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Send className="w-4 h-4 text-green-600" />
                              <h4 className="font-medium text-green-800 dark:text-green-200">Issued Documents</h4>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300">Documents that have been issued and are active.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left p-3 font-medium">Doc Number</th>
                                  <th className="text-left p-3 font-medium">Document Name</th>
                                  <th className="text-left p-3 font-medium">Rev</th>
                                  <th className="text-left p-3 font-medium">Preparer</th>
                                  <th className="text-left p-3 font-medium">Issuer</th>
                                  <th className="text-left p-3 font-medium">Issued At</th>
                                  <th className="text-left p-3 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {issuedDocs.map((doc, index) => (
                                  <tr key={`issued-${doc.id || index}`} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-mono text-xs">{doc.docNumber}</td>
                                    <td className="p-3">{doc.docName}</td>
                                    <td className="p-3 text-center">{doc.revisionNo}</td>
                                    <td className="p-3">{doc.preparerName || 'Unknown'}</td>
                                    <td className="p-3">{doc.issuerName || '-'}</td>
                                    <td className="p-3">{doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString() : '-'}</td>
                                    <td className="p-3">
                                      <Button size="sm" variant="ghost" onClick={() => handleView({
                                        id: doc.id, docName: doc.docName, docNumber: doc.docNumber,
                                        status: "Issued", dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
                                        revisionNo: doc.revisionNo, preparedBy: doc.preparerName || 'Unknown'
                                      })}><Eye className="w-4 h-4" /></Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-12 text-center">
                          <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">No issued documents</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="declined" className="mt-6">
                      {declinedDocs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <h4 className="font-medium text-red-800 dark:text-red-200">Declined Documents</h4>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300">Documents that have been declined with comments.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left p-3 font-medium">Doc Number</th>
                                  <th className="text-left p-3 font-medium">Document Name</th>
                                  <th className="text-left p-3 font-medium">Rev</th>
                                  <th className="text-left p-3 font-medium">Preparer</th>
                                  <th className="text-left p-3 font-medium">Declined By</th>
                                  <th className="text-left p-3 font-medium">Remarks</th>
                                  <th className="text-left p-3 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {declinedDocs.map((doc, index) => (
                                  <tr key={`declined-${doc.id || index}`} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-mono text-xs">{doc.docNumber}</td>
                                    <td className="p-3">{doc.docName}</td>
                                    <td className="p-3 text-center">{doc.revisionNo}</td>
                                    <td className="p-3">{doc.preparerName || 'Unknown'}</td>
                                    <td className="p-3">{doc.approverName || '-'}</td>
                                    <td className="p-3 max-w-[200px] truncate" title={doc.declineRemarks || ''}>
                                      {doc.declineRemarks || '-'}
                                    </td>
                                    <td className="p-3">
                                      <Button size="sm" variant="ghost" onClick={() => handleView({
                                        id: doc.id, docName: doc.docName, docNumber: doc.docNumber,
                                        status: "Declined", dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
                                        revisionNo: doc.revisionNo, preparedBy: doc.preparerName || 'Unknown'
                                      })}><Eye className="w-4 h-4" /></Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-12 text-center">
                          <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">No declined documents</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">User Management</h3>
                    <p className="text-sm text-muted-foreground">Manage system users and their permissions</p>
                  </div>
                  <Button onClick={() => setUserDialogOpen(true)} data-testid="button-add-user-inline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New User
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold">Creators</h3>
                      </div>
                      <Badge variant="secondary">{usersData?.creators.length || 0}</Badge>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {usersData?.creators.map((user, index) => (
                          <UserCard key={`creator-${user.id || index}`} user={user} role="creator" index={index} onDelete={handleDeleteUser} />
                        ))}
                        {(!usersData?.creators || usersData.creators.length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No creators found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-500" />
                        <h3 className="text-lg font-semibold">Approvers</h3>
                      </div>
                      <Badge variant="secondary">{usersData?.approvers.length || 0}</Badge>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {usersData?.approvers.map((user, index) => (
                          <UserCard key={`approver-${user.id || index}`} user={user} role="approver" index={index} onDelete={handleDeleteUser} />
                        ))}
                        {(!usersData?.approvers || usersData.approvers.length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No approvers found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold">Issuers</h3>
                      </div>
                      <Badge variant="secondary">{usersData?.issuers.length || 0}</Badge>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {usersData?.issuers.map((user, index) => (
                          <UserCard key={`issuer-${user.id || index}`} user={user} role="issuer" index={index} onDelete={handleDeleteUser} />
                        ))}
                        {(!usersData?.issuers || usersData.issuers.length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No issuers found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold">Administrators</h3>
                      </div>
                      <Badge variant="secondary">{usersData?.admins.length || 0}</Badge>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {usersData?.admins.map((user, index) => (
                          <UserCard key={`admin-${user.id || index}`} user={user} role="admin" index={index} onDelete={handleDeleteUser} />
                        ))}
                        {(!usersData?.admins || usersData.admins.length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No administrators found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="departments" className="mt-6">
              <motion.div
                key="departments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Department Management</h3>
                      <p className="text-sm text-muted-foreground">Departments organized by categories</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {departmentData.categories.reduce((total, cat) => total + cat.departments.length, 0)} Total
                      </Badge>
                      <Button onClick={() => setDeptDialogOpen(true)} data-testid="button-add-dept-inline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Department
                      </Button>
                    </div>
                  </div>
                  
                  {departmentData.categories.map((category, categoryIndex) => {
                    const isExpanded = expandedCategories[category.id] ?? false;
                    const displayedDepartments = isExpanded ? category.departments : category.departments.slice(0, 3);
                    
                    return (
                      <Card key={category.id} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold">{category.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {category.departments.length} departments
                              </p>
                            </div>
                          </div>
                          {category.departments.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCategory(category.id)}
                              className="flex items-center gap-2"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-4 h-4" />
                                  Show All ({category.departments.length})
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {displayedDepartments.map((dept, index) => (
                            <motion.div
                              key={`${category.id}-${dept.id}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: (categoryIndex * 0.1) + (index * 0.05) }}
                              whileHover={{ scale: 1.02 }}
                              className="p-4 rounded-lg bg-muted/30 hover-elevate"
                              data-testid={`dept-card-${dept.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Building2 className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{dept.name}</p>
                                  <p className="text-xs text-muted-foreground">ID: {dept.id}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        
                        {!isExpanded && category.departments.length > 3 && (
                          <div className="mt-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Showing 3 of {category.departments.length} departments
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Custom Departments Section */}
                <div className="mt-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-primary" />
                      Custom Departments
                    </h3>
                    <p className="text-sm text-muted-foreground">Departments created by users (can be deleted)</p>
                    <div className="text-sm font-medium text-primary mt-1">
                      {departmentsLoading ? "Loading..." : `${dynamicDepartments?.length || 0} Total`}
                    </div>
                  </div>

                  {departmentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2">Loading departments...</span>
                    </div>
                  ) : dynamicDepartments && dynamicDepartments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dynamicDepartments.map((dept, index) => (
                        <motion.div
                          key={`custom-${dept.id}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-lg bg-orange-50 border border-orange-200 hover-elevate"
                          data-testid={`custom-dept-card-${dept.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-100">
                                <Building2 className="w-4 h-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{dept.name}</p>
                                <p className="text-xs text-muted-foreground">Code: {dept.code}</p>
                                <p className="text-xs text-muted-foreground">ID: {dept.id}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDept(dept.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={`Delete ${dept.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No custom departments created yet</p>
                      <p className="text-sm text-muted-foreground">
                        Use the "Add Department" button above to create custom departments that can be managed and deleted.
                      </p>
                    </Card>
                  )}
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      <DocumentViewDialog
        document={selectedDoc}
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onDownload={() => {}}
      />

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specific role and access permissions.
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} data-testid="input-user-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} data-testid="input-user-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                        <SelectItem value="issuer">Issuer</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="recipient">Recipient</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the role that defines user permissions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="masterCopyAccess"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Master Copy Access</FormLabel>
                      <FormDescription>
                        Allow access to all document versions
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-master-copy"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-user">
                  {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department for document distribution.
            </DialogDescription>
          </DialogHeader>
          <Form {...deptForm}>
            <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">
              <FormField
                control={deptForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engineering" {...field} data-testid="input-dept-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={deptForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ENG" {...field} data-testid="input-dept-code" />
                    </FormControl>
                    <FormDescription>
                      Short code for the department (max 10 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDeptMutation.isPending} data-testid="button-submit-dept">
                  {createDeptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Department
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
