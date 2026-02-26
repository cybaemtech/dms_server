import { useState } from "react";
import ApprovalDialog from "../ApprovalDialog";
import { Button } from "@/components/ui/button";

export default function ApprovalDialogExample() {
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  return (
    <div className="p-6 space-x-4">
      <Button onClick={() => setApproveOpen(true)}>Open Approve Dialog</Button>
      <Button variant="destructive" onClick={() => setDeclineOpen(true)}>
        Open Decline Dialog
      </Button>

      <ApprovalDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onApprove={(data) => console.log("Approved with:", data)}
        type="approve"
        title="Approve Document"
      />

      <ApprovalDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onDecline={(remarks) => console.log("Declined with:", remarks)}
        type="decline"
        title="Decline Document"
      />
    </div>
  );
}
