/**
 * D256: the version published, shown small in the top left corner (the owner: "add a little mark
 * discreetly to the top corner (WTC 0.1, then WTC 0.2…) so that I can know whether I'm testing the
 * right version"). Raised by 0.1 with every update published to the Pages site.
 */
export const VERSION = "WTC 1.19";

/** Puts the mark on the page (once). */
export function markVersion() {
  if (typeof document === "undefined" || document.getElementById("wtc-version")) return;
  const el = document.createElement("div");
  el.id = "wtc-version";
  el.textContent = VERSION;
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
}
