export const ASSIGN_FLOW_STEPS = [
  {
    description: "Name your gift exchange and set a budget. Both optional.",
    id: 1,
    label: "Event",
    title: "Set up your event",
  },
  {
    description:
      "Choose email or QR cards for each person. You can organize without playing.",
    id: 2,
    label: "People",
    title: "Add participants",
  },
  {
    description:
      "Optionally block pairings so certain people can’t draw each other.",
    id: 3,
    label: "Rules",
    title: "Set exclusions",
  },
  {
    description:
      "Review everyone, draw names, then email or print their matches.",
    id: 4,
    label: "Share",
    title: "Draw & share",
  },
] as const;

export type AssignFlowStepId = (typeof ASSIGN_FLOW_STEPS)[number]["id"];
