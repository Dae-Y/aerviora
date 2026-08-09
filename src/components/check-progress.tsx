import { FlowScreen } from "@/lib/check-options";

interface CheckProgressProps {
  currentScreen: FlowScreen;
}

const STEPS: { id: FlowScreen; label: string; stepNumber: number }[] = [
  { id: "location", label: "Location", stepNumber: 1 },
  { id: "sensitivities", label: "Sensitivities", stepNumber: 2 },
  { id: "activity", label: "Activity", stepNumber: 3 },
];

export function CheckProgress({ currentScreen }: CheckProgressProps) {
  if (
    currentScreen === "review" ||
    currentScreen === "completion" ||
    currentScreen === "environment-loading" ||
    currentScreen === "environment-success" ||
    currentScreen === "environment-error"
  ) {
    return null;
  }

  const currentStepNumber =
    currentScreen === "location" ? 1 : currentScreen === "sensitivities" ? 2 : 3;

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {STEPS.map((step) => {
          const isActive = currentScreen === step.id;
          const isCompleted = step.stepNumber < currentStepNumber;

          return (
            <li
              key={step.id}
              aria-current={isActive ? "step" : undefined}
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#1F5A55]/10 border-[#1F5A55] text-[#1F5A55]"
                  : isCompleted
                  ? "bg-white/80 border-[#0A2928]/15 text-[#0A2928]"
                  : "bg-white/40 border-[#0A2928]/10 text-[#4E7C77]"
              }`}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  isActive
                    ? "bg-[#1F5A55] text-white"
                    : isCompleted
                    ? "bg-emerald-700 text-white"
                    : "bg-[#0A2928]/10 text-[#4E7C77]"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3 h-3 stroke-current fill-none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  step.stepNumber
                )}
              </span>
              <span className="truncate text-center sm:text-left text-[11px] sm:text-xs">
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
