/** Browser-side loader: the dataset JSON is bundled by Vite (its slim copy, without the notes' MusicXML locators: tools/fux_import/slim_two_voice.py); nothing parses MusicXML at runtime. */
import data from "../../../data/fux/two-voice/fux-two-voice.game.json" with { type: "json" };
import { FuxRepository } from "./repository.ts";
import type { FuxDataset } from "./types.ts";

export const repository = new FuxRepository(data as unknown as FuxDataset);
