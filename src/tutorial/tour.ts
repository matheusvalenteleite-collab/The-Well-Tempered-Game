/** The tour of the game screen (D98): its stops, in order — a text id and the element it points at (none: a card in the middle). */
export const TOUR_STOPS: { id: string; selector?: string }[] = [
  { id: "intro" },
  { id: "nav", selector: ".exercise-nav" },
  { id: "score", selector: ".score-wrap" },
  { id: "view", selector: ".view-menu" },
  { id: "write", selector: ".group.write" },
  { id: "evaluate", selector: ".group.judge" },
  { id: "listen", selector: ".group.listen" },
  { id: "star", selector: ".score-wrap .star" },
  { id: "fux", selector: ".fux-tool" },
  { id: "dock", selector: ".dock-tabs" },
  { id: "info", selector: ".infobar" },
  { id: "help", selector: ".header-tools .tutorial-btn" },
];
