import { CheckCircle, Circle, Clock } from "lucide-react";

export type WorkflowStep = "Creator" | "Approver" | "Issuer" | "Issued";

interface WorkflowProgressProps {
  currentStep: WorkflowStep;
  className?: string;
}

export default function WorkflowProgress({ currentStep, className }: WorkflowProgressProps) {
  const steps: WorkflowStep[] = ["Creator", "Approver", "Issuer", "Issued"];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className={`flex items-center justify-between ${className}`} data-testid="workflow-progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground"
                }`}
                data-testid={`step-${step.toLowerCase()}`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-8 transition-colors ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
