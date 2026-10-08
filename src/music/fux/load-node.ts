/** Node-side loader (tests, tooling). In a bundled game, import the JSON and pass it to FuxRepository. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FuxRepository } from "./repository.ts";
import type { FuxDataset } from "./types.ts";

export const FUX_DATASET_PATH = fileURLToPath(new URL("../../../data/fux/two-voice/fux-two-voice.json", import.meta.url));

export function loadFuxRepository(path: string = FUX_DATASET_PATH): FuxRepository {
  return new FuxRepository(JSON.parse(readFileSync(path, "utf8")) as FuxDataset);
}
