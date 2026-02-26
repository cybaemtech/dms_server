import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import departmentData from "../../../shared/departmentData.json";

interface DepartmentItem {
  id: string;
  name: string;
}

interface DepartmentCategory {
  id: string;
  name: string;
  departments: DepartmentItem[];
}

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove?: (data: { remarks: string; departments: string[]; approverName: string }) => void;
  onDecline?: (remarks: string) => void;
  title?: string;
  type?: "approve" | "decline";
  approverName?: string;
  nameFieldLabel?: string;
}

export default function ApprovalDialog({
  open,
  onClose,
  onApprove,
  onDecline,
  title = "Document Approval",
  type = "approve",
  approverName: initialApproverName = "",
  nameFieldLabel = "Approved By",
}: ApprovalDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [approverName, setApproverName] = useState(initialApproverName);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    departmentData.categories.map((cat) => cat.id)
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories: DepartmentCategory[] = departmentData.categories;

  useEffect(() => {
    setApproverName(initialApproverName);
  }, [initialApproverName]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setApproverName(initialApproverName);
      setRemarks("");
      setSelectedDepartments([]);
      setSearchQuery("");
    }
  }, [open, initialApproverName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDepartmentToggle = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSelectAllCategory = (category: DepartmentCategory) => {
    const categoryDeptIds = category.departments.map((d) => d.id);
    const allSelected = categoryDeptIds.every((id) => selectedDepartments.includes(id));
    
    if (allSelected) {
      setSelectedDepartments((prev) => prev.filter((id) => !categoryDeptIds.includes(id)));
    } else {
      setSelectedDepartments((prev) => Array.from(new Set([...prev, ...categoryDeptIds])));
    }
  };

  const clearAllSelections = () => {
    setSelectedDepartments([]);
  };

  const removeDepartment = (deptId: string) => {
    setSelectedDepartments((prev) => prev.filter((id) => id !== deptId));
  };

  const getDepartmentName = (deptId: string): string => {
    for (const category of categories) {
      const dept = category.departments.find((d) => d.id === deptId);
      if (dept) return dept.name;
    }
    return deptId;
  };

  const getFilteredCategories = (): DepartmentCategory[] => {
    if (!searchQuery.trim()) return categories;

    return categories
      .map((category) => ({
        ...category,
        departments: category.departments.filter((dept) =>
          dept.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.departments.length > 0);
  };

  const getCategorySelectedCount = (category: DepartmentCategory): number => {
    return category.departments.filter((d) => selectedDepartments.includes(d.id)).length;
  };

  const getSelectedDepartmentObjects = (): { id: string; name: string }[] => {
    return selectedDepartments.map((deptId) => ({
      id: deptId,
      name: getDepartmentName(deptId),
    }));
  };

  const handleSubmit = () => {
    if (type === "approve") {
      const departmentObjects = getSelectedDepartmentObjects();
      onApprove?.({ remarks, departments: departmentObjects.map(d => d.id), approverName });
    } else {
      onDecline?.(remarks);
    }
    setRemarks("");
    setSelectedDepartments([]);
    // Don't reset approverName here - let it be reset when dialog reopens
    setSearchQuery("");
    onClose();
  };

  const filteredCategories = getFilteredCategories();
  const displayedDepartments = selectedDepartments.slice(0, 6);
  const remainingCount = selectedDepartments.length - 6;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-approval">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === "approve" && (
            <div className="space-y-2">
              <Label htmlFor="approverName">{nameFieldLabel} *</Label>
              <Input
                id="approverName"
                placeholder="Enter your name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="bg-muted"
                data-testid="input-approver-name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks *</Label>
            <Textarea
              id="remarks"
              placeholder={
                type === "approve"
                  ? "Add approval remarks..."
                  : "Add reason for declining..."
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              className="bg-muted"
              data-testid="input-remarks"
            />
          </div>

          {type === "approve" && (
            <div className="space-y-3">
              <Label>Share with Departments (Optional)</Label>
              
              <div className="relative" ref={dropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full justify-between bg-muted border-border"
                  data-testid="dropdown-departments"
                >
                  <span className="text-muted-foreground">
                    {selectedDepartments.length > 0
                      ? `${selectedDepartments.length} department(s) selected`
                      : "Select departments..."}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </Button>

                {dropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search departments..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 bg-muted"
                          data-testid="input-search-departments"
                        />
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {filteredCategories.map((category) => {
                        const isExpanded = expandedCategories.includes(category.id);
                        const selectedCount = getCategorySelectedCount(category);
                        const allSelected = category.departments.every((d) =>
                          selectedDepartments.includes(d.id)
                        );

                        return (
                          <div key={category.id} className="border-b border-border last:border-b-0">
                            <div
                              className="flex items-center justify-between p-2 hover-elevate cursor-pointer"
                              onClick={() => toggleCategory(category.id)}
                              data-testid={`category-header-${category.id}`}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="font-medium">{category.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({selectedCount}/{category.departments.length})
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAllCategory(category);
                                }}
                                className="text-xs h-6"
                                data-testid={`button-select-all-${category.id}`}
                              >
                                {allSelected ? "Deselect All" : "Select All"}
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="pb-2 px-2">
                                {category.departments.map((dept) => (
                                  <div
                                    key={dept.id}
                                    className="flex items-center gap-2 py-1.5 px-6 hover-elevate rounded cursor-pointer"
                                    onClick={() => handleDepartmentToggle(dept.id)}
                                    data-testid={`dept-item-${dept.id}`}
                                  >
                                    <Checkbox
                                      checked={selectedDepartments.includes(dept.id)}
                                      onCheckedChange={() => handleDepartmentToggle(dept.id)}
                                      data-testid={`checkbox-dept-${dept.id}`}
                                    />
                                    <span className="text-sm">{dept.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {filteredCategories.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          No departments found matching "{searchQuery}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 border-t border-border bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        {selectedDepartments.length} selected
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllSelections}
                        className="text-xs"
                        data-testid="button-clear-all"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {displayedDepartments.map((deptId) => (
                    <span
                      key={deptId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md"
                      data-testid={`tag-dept-${deptId}`}
                    >
                      {getDepartmentName(deptId)}
                      <button
                        type="button"
                        onClick={() => removeDepartment(deptId)}
                        className="hover:bg-primary/20 rounded p-0.5"
                        data-testid={`remove-dept-${deptId}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {remainingCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                      +{remainingCount} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!remarks.trim() || (type === "approve" && !approverName.trim())}
            variant={type === "approve" ? "default" : "destructive"}
            data-testid={`button-${type}`}
          >
            {type === "approve" ? "Approve" : "Decline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
