/**
 * The scale of the whole screen (D103): below 1 when a small window shows the designed layout
 * scaled down. Things placed in screen coordinates (cards that follow the pointer) divide by it.
 */
let current = 1;
export const setUiScale = (s: number) => {
  current = s;
};
export const uiScale = () => current;
