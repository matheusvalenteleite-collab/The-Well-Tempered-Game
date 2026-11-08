// src/bench/drum-presets-link.ts — D514: the Instruments presets given to the selection's DRUMS row (D450); D526: the whole drum library, HOME first
import { registerDrumPresets } from "./LiteDrums.tsx";
import { drumPresetsFor, setDrumPreset } from "../touch/drum-library.ts";
registerDrumPresets({ presetsFor: drumPresetsFor, apply: setDrumPreset });
