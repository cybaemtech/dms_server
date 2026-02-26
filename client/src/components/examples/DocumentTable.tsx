import DocumentTable, { Document } from "../DocumentTable";

export default function DocumentTableExample() {
  const mockDocuments: Document[] = [
    {
      id: "1",
      docName: "Quality Control SOP",
      docNumber: "QC-SOP-001",
      status: "Pending",
      dateOfIssue: "2024-11-01",
      revisionNo: 2,
      preparedBy: "John Smith",
    },
    {
      id: "2",
      docName: "Safety Guidelines",
      docNumber: "SF-GL-045",
      status: "Approved",
      dateOfIssue: "2024-10-28",
      revisionNo: 1,
      preparedBy: "Sarah Johnson",
    },
    {
      id: "3",
      docName: "Production Format",
      docNumber: "PR-FMT-023",
      status: "Issued",
      dateOfIssue: "2024-10-15",
      revisionNo: 3,
      preparedBy: "Mike Davis",
    },
  ];

  return (
    <div className="p-6">
      <DocumentTable
        documents={mockDocuments}
        onView={(doc) => console.log("View document:", doc)}
        onDownload={(doc) => console.log("Download document:", doc)}
        onApprove={(doc) => console.log("Approve document:", doc)}
        onDecline={(doc) => console.log("Decline document:", doc)}
      />
    </div>
  );
}
