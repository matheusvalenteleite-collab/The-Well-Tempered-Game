/**
 * D355: the colour plans (colour.ts), in a module of their own so that they are a chunk loaded on demand
 * (colour.ts loadColours), not part of every page's first download. Written by tools/touch/colour-plans.ts.
 */
import plans from "../../data/touch/colour-plans.json" with { type: "json" };

export const COLOUR_PLANS: unknown = plans;
