import type { ModalFinal, Staff } from "../../music/fux/types.ts";
import type { SpeciesId } from "../layout.ts";

export type Severity = "error" | "warning";
export type RuleSource = "fux" | "modern";

/** Where the rule is stated. Page numbers refer to the 1725 Vienna print (scans in the upstream repository). */
export interface Attribution {
  /** "contradicted": the Gradus states or approves the opposite. */
  status: "verified" | "unverified" | "contradicted";
  /** e.g. "Gradus (1725), Exercitii I, Lectio I, p. 47" */
  ref?: string;
  note?: string;
}

/** Positions are 0-based slot indices (see counterpoint/layout.ts); in first species a slot is a bar. */
export interface Violation {
  ruleId: string;
  positions: number[];
  severity: Severity;
  messageKey: string;
  /** Machine-readable detail for display/debugging (interval names, motion type ...). */
  detail?: Record<string, string | number>;
}

/** One voice as a sequence of spelled pitches with rational durations ("1/1"). */
export interface VoiceNote {
  pitch: string | null;
  duration: string;
}

export interface CounterpointInput {
  species: SpeciesId;
  modalFinal: ModalFinal;
  /** Staff of the cantus firmus; the counterpoint is on the other one. */
  cantusVoice: Staff;
  cantus: VoiceNote[];
  counterpoint: VoiceNote[];
}

/** A sounding counterpoint note against the cantus note of its bar. */
export interface NoteEvent {
  /** Slot index (the position reported in violations). */
  slot: number;
  bar: number;
  /** 0 = thesis (downbeat), 1 = arsis (upbeat). */
  beat: 0 | 1;
  cantus: string;
  counterpoint: string;
}

/** Precomputed, validated view of the input that every rule reads. */
export interface Analysis {
  input: CounterpointInput;
  /** First species: one entry per bar (empty in other species). */
  cantus: string[];
  counterpoint: string[];
  length: number;
  /** Every sounding counterpoint note, in order (all species). */
  events: NoteEvent[];
  bars: number;
}

export interface Rule {
  id: string;
  source: RuleSource;
  severity: Severity;
  species: SpeciesId[];
  /**
   * "any": stated for both voice arrangements.
   * "cantus-below": stated (so far) only for the cantus in the lower voice.
   */
  voicing: "any" | "cantus-below";
  /** Only applies to exercises on these finals (e.g. the Ionian accidental rule). */
  finals?: ModalFinal[];
  messageKey: string;
  attribution: Attribution;
  /** An open pedagogical decision attached to this rule, if any. */
  pending?: string;
  check(a: Analysis): Violation[];
}
