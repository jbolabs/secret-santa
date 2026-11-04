import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import type { AssignFlowStepId } from "./assign-flow-metadata";

export interface AssignShellFooterProps {
  onBack?: () => void;
  showBack?: boolean;
  primaryAction?: {
    disabled?: boolean;
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

interface BuildAssignShellFooterInput {
  step: AssignFlowStepId;
  hasAssignments: boolean;
  playersCount: number;
  onBack: () => void;
  onPersistEventAndContinue: () => void;
  onGoToStep: (step: AssignFlowStepId) => void;
  onGenerateAssignments: () => void;
}

export function buildAssignShellFooter({
  step,
  hasAssignments,
  playersCount,
  onBack,
  onPersistEventAndContinue,
  onGoToStep,
  onGenerateAssignments,
}: BuildAssignShellFooterInput): AssignShellFooterProps {
  if (hasAssignments) {
    return {};
  }

  switch (step) {
    case 1: {
      return {
        onBack,
        primaryAction: {
          label: "Continue",
          onClick: onPersistEventAndContinue,
        },
        showBack: true,
      };
    }
    case 2: {
      return {
        onBack,
        primaryAction: {
          disabled: playersCount < 3,
          label: "Continue",
          onClick: () => {
            onGoToStep(3);
          },
        },
        showBack: true,
      };
    }
    case 3: {
      return {
        onBack,
        primaryAction: {
          label: "Continue",
          onClick: () => {
            onGoToStep(4);
          },
        },
        showBack: true,
      };
    }
    case 4: {
      return {
        onBack,
        primaryAction: {
          disabled: playersCount < 3,
          icon: <Sparkles data-icon="inline-start" />,
          label: "Draw names",
          onClick: onGenerateAssignments,
        },
        showBack: true,
      };
    }
    default: {
      return {};
    }
  }
}
