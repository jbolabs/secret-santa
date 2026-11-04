import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import type { AssignFlowStepId } from "../components/assign-flow-metadata";
import { AssignFlowSteps } from "../components/assign-flow-steps";
import { buildAssignShellFooter } from "../components/assign-shell-footer";
import { AssignStepperShell } from "../components/assign-stepper-shell";
import { AssignmentAnimation } from "../components/assignment-animation";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useExchangeWebMCP } from "../hooks/use-exchange-webmcp";
import { drawDurationMs } from "../lib/draw-timeline";
import { MIN_DRAWING_PLAYERS, drawingPlayers } from "../lib/players";
import { generateAssignments } from "../lib/secret-santa-assignments";
import { pageHead } from "../lib/seo";
import { readSetupLink } from "../lib/setup-link";
import {
  addConstraint,
  addPlayer,
  clearAllData,
  clearAssignments,
  getData,
  removeConstraint,
  removePlayer,
  replacePlayers,
  saveAssignments,
  saveData,
  saveConstraints,
  saveEvent,
  toggleAdmin,
  toggleSitsOut,
} from "../lib/storage";
import { getTurnstileSiteKey } from "../lib/turnstile-site-key";
import type { Assignment, Constraint, Player } from "../lib/types";
import { toTitleCase } from "../lib/utils";

export const Route = createFileRoute("/assign")({
  component: AssignPage,
  loader: async () => ({ turnstileSiteKey: await getTurnstileSiteKey() }),
  head: () =>
    pageHead({
      description:
        "Add names, set exclusions, and draw. Send matches by email, or hand out QR cards and private links. Free, no sign-up.",
      path: "/assign",
      title: "Draw names for Secret Santa",
    }),
});

interface ListState {
  players: Player[];
  constraints: Constraint[];
  assignments: Assignment[];
  animationComplete: boolean;
}

type ListAction =
  | { type: "sync_from_storage"; animationComplete?: boolean }
  | { type: "patch"; patch: Partial<ListState> }
  | { type: "reset_lists" };

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "sync_from_storage": {
      const data = getData();
      return {
        animationComplete: action.animationComplete ?? state.animationComplete,
        assignments: data.assignments,
        constraints: data.constraints,
        players: data.players,
      };
    }
    case "patch": {
      return { ...state, ...action.patch };
    }
    case "reset_lists": {
      return {
        animationComplete: false,
        assignments: [],
        constraints: [],
        players: [],
      };
    }
    default: {
      return state;
    }
  }
}

function AssignPage() {
  const { turnstileSiteKey } = Route.useLoaderData();
  const navigate = useNavigate();
  const [stepState, setStepState] = useState<{
    step: AssignFlowStepId;
    direction: 1 | -1;
  }>({ direction: 1, step: 1 });
  const { step, direction } = stepState;
  const [event, setEvent] = useState({ budget: "", partyName: "" });
  const { partyName, budget } = event;
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
    details?: string;
  }>({ message: "", open: false });
  const [listState, dispatchList] = useReducer(listReducer, {
    animationComplete: false,
    assignments: [],
    constraints: [],
    players: [],
  });

  const { players, constraints, assignments, animationComplete } = listState;
  // Memoized: the draw animation picks its cards from this list once.
  const drawing = useMemo(() => drawingPlayers(players), [players]);

  // Survives a re-run of the mount effect after the hash is cleared
  const setupHash = useRef<string | null>(null);

  useEffect(() => {
    clearAllData();
    setupHash.current ??= window.location.hash;
    const setup = readSetupLink(setupHash.current);
    if (!setup) {
      return;
    }
    // Keep names and emails out of the address bar and history
    window.history.replaceState(null, "", window.location.pathname);
    if ("error" in setup) {
      toast.error("Couldn’t load that setup link", {
        description: setup.error,
        id: "setup-link",
      });
      return;
    }
    saveData({ ...setup.draft, assignments: [] });
    // The hash only exists in the browser, so it can't seed state during SSR
    // oxlint-disable-next-line react/set-state-in-effect
    setEvent({
      budget: setup.draft.budget ?? "",
      partyName: setup.draft.partyName,
    });
    dispatchList({ type: "sync_from_storage" });
    setStepState({ direction: 1, step: 4 });
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const timer = setTimeout(() => {
      setIsGenerating(false);
      dispatchList({
        patch: { animationComplete: true },
        type: "patch",
      });
    }, drawDurationMs(drawing.length));
    return () => {
      clearTimeout(timer);
    };
  }, [isGenerating, drawing.length]);

  const goToStep = (next: AssignFlowStepId) => {
    setStepState({ direction: next >= step ? 1 : -1, step: next });
  };

  const saveEventAndContinue = () => {
    const saved = {
      budget: budget.trim(),
      partyName: toTitleCase(partyName.trim()),
    };
    setEvent(saved);
    saveEvent(saved);
    goToStep(2);
  };

  const handleAddPlayer = (player: Player) => {
    addPlayer(player);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleRemovePlayer = (playerId: string) => {
    removePlayer(playerId);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleToggleAdmin = (playerId: string) => {
    toggleAdmin(playerId);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleToggleSitsOut = (playerId: string) => {
    toggleSitsOut(playerId);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleImportPlayers = (importedPlayers: Player[]) => {
    if (importedPlayers.length < 3) {
      setErrorDialog({
        details: "Imported file must contain at least 3 participants.",
        message: "Not enough participants",
        open: true,
      });
      return;
    }
    replacePlayers(importedPlayers);
    dispatchList({ animationComplete: false, type: "sync_from_storage" });
  };

  const handleAddConstraint = (constraint: Constraint) => {
    addConstraint(constraint);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleRemoveConstraint = (constraintId: string) => {
    removeConstraint(constraintId);
    dispatchList({ type: "sync_from_storage" });
  };

  const handleGenerateAssignments = (
    previousAssignments: Assignment[] = []
  ) => {
    if (drawing.length < MIN_DRAWING_PLAYERS) {
      setErrorDialog({
        details:
          "You need at least 3 people drawing names to generate Secret Santa assignments.",
        message: "Not enough players",
        open: true,
      });
      return { error: "At least 3 participants must draw names." };
    }

    const result = generateAssignments(
      drawing,
      constraints,
      previousAssignments
    );

    if (result.success && result.assignments) {
      setIsGenerating(true);
      saveAssignments(result.assignments);
      dispatchList({
        patch: { animationComplete: false, assignments: result.assignments },
        type: "patch",
      });
    } else {
      setIsGenerating(false);
      setErrorDialog({
        details: result.details,
        message: result.error || "Failed to generate assignments",
        open: true,
      });
    }
    return result.success
      ? {
          status: "drawing",
          next: "Wait for the animation, then use get_delivery_status. Send emails with send_assignment_emails if anyone has one; people without email get reveal cards on the page.",
        }
      : { error: result.error, details: result.details };
  };

  const handleStartOver = () => {
    goToStep(2);
    clearAssignments();
    dispatchList({
      patch: { animationComplete: false, assignments: [] },
      type: "patch",
    });
  };

  const handleClearAll = () => {
    clearAllData();
    dispatchList({ type: "reset_lists" });
    goToStep(2);
  };

  const handleClearConstraints = () => {
    saveConstraints([]);
    dispatchList({
      patch: { constraints: [] },
      type: "patch",
    });
  };

  const handleStepBack = () => {
    if (step > 1) {
      goToStep((step - 1) as AssignFlowStepId);
      return;
    }
    void navigate({ to: "/" });
  };

  useExchangeWebMCP({
    partyName,
    budget,
    players,
    constraints,
    assignments,
    isGenerating,
    goToStep,
    handleGenerateAssignments,
    onConfigure: (configured) => {
      setEvent(configured);
      dispatchList({ type: "sync_from_storage" });
    },
  });

  const hasAssignments = assignments.length > 0 && animationComplete;

  const shellFooter = buildAssignShellFooter({
    hasAssignments,
    onBack: handleStepBack,
    onGenerateAssignments: handleGenerateAssignments,
    onGoToStep: goToStep,
    onPersistEventAndContinue: saveEventAndContinue,
    playersCount: drawing.length,
    step,
  });

  if (isGenerating) {
    return <AssignmentAnimation players={drawing} />;
  }

  return (
    <>
      <AssignStepperShell
        currentStep={step}
        direction={direction}
        showHeading={!hasAssignments}
        {...shellFooter}
      >
        <AssignFlowSteps
          assignments={assignments}
          constraints={constraints}
          hasAssignments={hasAssignments}
          onAddConstraint={handleAddConstraint}
          onAddPlayer={handleAddPlayer}
          onClearAllPlayers={handleClearAll}
          onClearConstraints={handleClearConstraints}
          onImportPlayers={handleImportPlayers}
          onEventChange={setEvent}
          onEventSubmit={saveEventAndContinue}
          onRemoveConstraint={handleRemoveConstraint}
          onRemovePlayer={handleRemovePlayer}
          onRedraw={() => handleGenerateAssignments(assignments)}
          onStartOver={handleStartOver}
          onToggleAdmin={handleToggleAdmin}
          onToggleSitsOut={handleToggleSitsOut}
          event={event}
          players={players}
          step={step}
          turnstileSiteKey={turnstileSiteKey}
        />
      </AssignStepperShell>

      <Dialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDialog.message}</DialogTitle>
            <DialogDescription variant="body">
              {errorDialog.details}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setErrorDialog({ message: "", open: false })}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
