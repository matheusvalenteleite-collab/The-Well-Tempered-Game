import type { ModalFinal, Staff } from "../../music/fux/types.ts";

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

/** Positions are 0-based column indices (one column per cantus note in first species). */
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
  species: "first";
  modalFinal: ModalFinal;
  /** Staff of the cantus firmus; the counterpoint is on the other one. */
  cantusVoice: Staff;
  cantus: VoiceNote[];
  counterpoint: VoiceNote[];
}

/** Precomputed, validated view of the input that every rule reads. */
export interface Analysis {
  input: CounterpointInput;
  cantus: string[];
  counterpoint: string[];
  length: number;
}

export interface Rule {
  id: string;
  source: RuleSource;
  severity: Severity;
  species: ("first")[];
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
