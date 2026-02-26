import WorkflowProgress from "../WorkflowProgress";

export default function WorkflowProgressExample() {
  return (
    <div className="p-6 space-y-8">
      <WorkflowProgress currentStep="Creator" />
      <WorkflowProgress currentStep="Approver" />
      <WorkflowProgress currentStep="Issuer" />
      <WorkflowProgress currentStep="Issued" />
    </div>
  );
}
