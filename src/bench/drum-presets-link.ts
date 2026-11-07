// src/bench/drum-presets-link.ts — D514: the Instruments presets given to the selection's DRUMS row (D450)
import { registerDrumPresets } from "./LiteDrums.tsx";
import { drumPresetsFor, setDrumPreset } from "../touch/drum-presets.ts";
registerDrumPresets({ presetsFor: drumPresetsFor, apply: setDrumPreset });
