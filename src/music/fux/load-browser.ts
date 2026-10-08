/** Browser-side loader: the dataset JSON is bundled by Vite; nothing parses MusicXML at runtime. */
import data from "../../../data/fux/two-voice/fux-two-voice.json" with { type: "json" };
import { FuxRepository } from "./repository.ts";
import type { FuxDataset } from "./types.ts";

export const repository = new FuxRepository(data as unknown as FuxDataset);
