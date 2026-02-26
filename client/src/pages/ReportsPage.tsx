import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface PrintLog {
  id: string;
  documentId: string;
  userId: string;
  controlCopyId: string;
  printedAt: string;
  documentName: string;
  documentNumber: string;
  userName: string;
  userEmail: string;
  controlCopyNumber: number;
}

interface ControlCopy {
  id: string;
  documentId: string;
  userId: string;
  actionType: string;
  copyNumber: number;
  generatedAt: string;
  documentName: string;
  documentNumber: string;
  userName: string;
  userEmail: string;
}

export default function ReportsPage() {
  const [searchDocId, setSearchDocId] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [searchCCDocId, setSearchCCDocId] = useState("");
  const [searchCCUserId, setSearchCCUserId] = useState("");
  const [activeTab, setActiveTab] = useState("printLogs");
  const { toast } = useToast();

  const { data: printLogsByDoc, isLoading: loadingByDoc, refetch: refetchByDoc } = useQuery<PrintLog[]>({
    queryKey: ["/api/reports/print-logs", searchDocId],
    queryFn: async () => {
      const response = await fetch(`/api/reports/print-logs?documentId=${searchDocId}`);
      if (!response.ok) throw new Error('Failed to fetch print logs');
      return response.json();
    },
    enabled: !!searchDocId && activeTab === "printLogs",
  });

  const { data: printLogsByUser, isLoading: loadingByUser, refetch: refetchByUser } = useQuery<PrintLog[]>({
    queryKey: [`/api/reports/print-logs?userId=${searchUserId}`],
    queryFn: async () => {
      const response = await fetch(`/api/reports/print-logs?userId=${searchUserId}`);
      if (!response.ok) throw new Error('Failed to fetch print logs');
      return response.json();
    },
    enabled: !!searchUserId && activeTab === "printLogs",
  });

  const { data: issuedDocs, isLoading: loadingIssued } = useQuery<any[]>({
    queryKey: ["/api/documents", { status: "issued" }],
    queryFn: async () => {
      const response = await fetch('/api/documents?status=issued');
      if (!response.ok) throw new Error('Failed to fetch issued documents');
      return response.json();
    },
    enabled: activeTab === "issuedDocs",
  });

  const { data: controlCopiesByDoc, isLoading: loadingCCByDoc, refetch: refetchCCByDoc } = useQuery<ControlCopy[]>({
    queryKey: ["/api/reports/control-copies", searchCCDocId],
    queryFn: async () => {
      const response = await fetch(`/api/reports/control-copies?documentId=${searchCCDocId}`);
      if (!response.ok) throw new Error('Failed to fetch control copies');
      return response.json();
    },
    enabled: !!searchCCDocId && activeTab === "controlCopies",
  });

  const { data: controlCopiesByUser, isLoading: loadingCCByUser, refetch: refetchCCByUser } = useQuery<ControlCopy[]>({
    queryKey: [`/api/reports/control-copies?userId=${searchCCUserId}`],
    queryFn: async () => {
      const response = await fetch(`/api/reports/control-copies?userId=${searchCCUserId}`);
      if (!response.ok) throw new Error('Failed to fetch control copies');
      return response.json();
    },
    enabled: !!searchCCUserId && activeTab === "controlCopies",
  });

  const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No data available to export",
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Data exported to ${filename}.xlsx`,
    });
  };

  const renderPrintLogs = (logs: PrintLog[] | undefined, loading: boolean) => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }

    if (!logs || logs.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No print logs found</div>;
    }

    return (
      <>
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => exportToExcel(logs, 'print_logs')}
            variant="outline"
            data-testid="button-export-print-logs"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Number</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>User Name</TableHead>
              <TableHead>User Email</TableHead>
              <TableHead>Control Copy No.</TableHead>
              <TableHead>Printed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} data-testid={`row-print-log-${log.id}`}>
                <TableCell className="font-mono">{log.documentNumber}</TableCell>
                <TableCell>{log.documentName}</TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>{log.userEmail}</TableCell>
                <TableCell className="font-mono">{log.controlCopyNumber}</TableCell>
                <TableCell>{new Date(log.printedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  const renderControlCopies = (copies: ControlCopy[] | undefined, loading: boolean) => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }

    if (!copies || copies.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No control copies found</div>;
    }

    return (
      <>
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => exportToExcel(copies, 'control_copies')}
            variant="outline"
            data-testid="button-export-control-copies"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Number</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>User Name</TableHead>
              <TableHead>User Email</TableHead>
              <TableHead>Control Copy No.</TableHead>
              <TableHead>Action Type</TableHead>
              <TableHead>Generated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {copies.map((cc) => (
              <TableRow key={cc.id} data-testid={`row-control-copy-${cc.id}`}>
                <TableCell className="font-mono">{cc.documentNumber}</TableCell>
                <TableCell>{cc.documentName}</TableCell>
                <TableCell>{cc.userName}</TableCell>
                <TableCell>{cc.userEmail}</TableCell>
                <TableCell className="font-mono">{cc.copyNumber}</TableCell>
                <TableCell className="capitalize">{cc.actionType}</TableCell>
                <TableCell>{new Date(cc.generatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-reports-title">
          <FileSpreadsheet className="w-8 h-8" />
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          View and export print logs and issued document reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="printLogs" data-testid="tab-print-logs">
            Print Logs
          </TabsTrigger>
          <TabsTrigger value="controlCopies" data-testid="tab-control-copies">
            Control Copies
          </TabsTrigger>
          <TabsTrigger value="issuedDocs" data-testid="tab-issued-docs">
            Issued Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printLogs" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Search Print Logs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docId">By Document ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="docId"
                    placeholder="Enter document ID"
                    value={searchDocId}
                    onChange={(e) => setSearchDocId(e.target.value)}
                    data-testid="input-search-doc-id"
                  />
                  <Button onClick={() => refetchByDoc()} disabled={!searchDocId} data-testid="button-search-doc">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId">By User ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="userId"
                    placeholder="Enter user ID"
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    data-testid="input-search-user-id"
                  />
                  <Button onClick={() => refetchByUser()} disabled={!searchUserId} data-testid="button-search-user">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            {searchDocId && renderPrintLogs(printLogsByDoc, loadingByDoc)}
            {searchUserId && renderPrintLogs(printLogsByUser, loadingByUser)}
            {!searchDocId && !searchUserId && (
              <div className="text-center py-8 text-muted-foreground">
                Enter a document ID or user ID to view print logs
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="controlCopies" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Search Control Copies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ccDocId">By Document ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="ccDocId"
                    placeholder="Enter document ID"
                    value={searchCCDocId}
                    onChange={(e) => setSearchCCDocId(e.target.value)}
                    data-testid="input-search-cc-doc-id"
                  />
                  <Button onClick={() => refetchCCByDoc()} disabled={!searchCCDocId} data-testid="button-search-cc-doc">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ccUserId">By User ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="ccUserId"
                    placeholder="Enter user ID"
                    value={searchCCUserId}
                    onChange={(e) => setSearchCCUserId(e.target.value)}
                    data-testid="input-search-cc-user-id"
                  />
                  <Button onClick={() => refetchCCByUser()} disabled={!searchCCUserId} data-testid="button-search-cc-user">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            {searchCCDocId && renderControlCopies(controlCopiesByDoc, loadingCCByDoc)}
            {searchCCUserId && renderControlCopies(controlCopiesByUser, loadingCCByUser)}
            {!searchCCDocId && !searchCCUserId && (
              <div className="text-center py-8 text-muted-foreground">
                Enter a document ID or user ID to view control copies
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="issuedDocs" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Issued Documents</h2>
              {issuedDocs && issuedDocs.length > 0 && (
                <Button
                  onClick={() => exportToExcel(issuedDocs, 'issued_documents')}
                  variant="outline"
                  data-testid="button-export-issued-docs"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>

            {loadingIssued ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !issuedDocs || issuedDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No issued documents found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Issued At</TableHead>
                    <TableHead>Departments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuedDocs.map((doc: any) => (
                    <TableRow key={doc.id} data-testid={`row-issued-doc-${doc.id}`}>
                      <TableCell className="font-mono">{doc.docNumber}</TableCell>
                      <TableCell>{doc.docName}</TableCell>
                      <TableCell>Rev {doc.revisionNo}</TableCell>
                      <TableCell>{doc.issuerName || 'N/A'}</TableCell>
                      <TableCell>{doc.issuedAt ? new Date(doc.issuedAt).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell>
                        {doc.departments?.map((d: any) => d.name).join(', ') || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
