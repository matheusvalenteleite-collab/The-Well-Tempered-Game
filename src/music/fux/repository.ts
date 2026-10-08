import type {
  AnnotationSet,
  CantusFirmus,
  Exercise,
  FuxDataset,
  ModalFinal,
  OriginalSolution,
  Species,
  Staff,
} from "./types.ts";

export interface ExerciseFilters {
  species?: Species | Species[];
  modal_final?: ModalFinal | ModalFinal[];
  cantus_voice?: Staff;
  /** Exact value, or an inclusive range. Difficulty is derived (see Exercise.difficulty.basis). */
  difficulty?: number | { min?: number; max?: number };
  cf_id?: string;
}

const asList = <T>(x: T | T[] | undefined): T[] | undefined => (x === undefined ? undefined : Array.isArray(x) ? x : [x]);

/** Read-only, indexed access to the Fux two-voice dataset. */
export class FuxRepository {
  readonly dataset: FuxDataset;
  private readonly exercises = new Map<string, Exercise>();
  private readonly cantusFirmi = new Map<string, CantusFirmus>();
  private readonly solutions = new Map<string, OriginalSolution>();
  private readonly annotations = new Map<string, AnnotationSet>();
  private readonly byCf = new Map<string, Exercise[]>();

  constructor(dataset: FuxDataset) {
    if (dataset.exercises.length !== 46) {
      throw new Error(`Fux dataset: expected 46 two-voice exercises, got ${dataset.exercises.length}`);
    }
    this.dataset = dataset;
    for (const cf of dataset.cantus_firmi) this.cantusFirmi.set(cf.cf_id, cf);
    for (const s of dataset.solutions) this.solutions.set(s.exercise_id, s);
    for (const a of dataset.annotations) this.annotations.set(a.exercise_id, a);
    for (const ex of dataset.exercises) {
      this.exercises.set(ex.id, ex);
      const cfId = ex.cantus_firmus.cf_id;
      if (!this.cantusFirmi.has(cfId)) throw new Error(`${ex.id}: unknown cf_id ${cfId}`);
      if (!this.solutions.has(ex.id)) throw new Error(`${ex.id}: no original solution`);
      if (!this.annotations.has(ex.id)) throw new Error(`${ex.id}: no annotations`);
      const list = this.byCf.get(cfId) ?? [];
      list.push(ex);
      this.byCf.set(cfId, list);
    }
  }

  /** All exercises in source (figure) order. */
  listExercises(filters: ExerciseFilters = {}): Exercise[] {
    const species = asList(filters.species);
    const finals = asList(filters.modal_final);
    const diff = filters.difficulty;
    return this.dataset.exercises.filter((ex) => {
      if (species && !species.includes(ex.species)) return false;
      if (finals && !finals.includes(ex.modal_final)) return false;
      if (filters.cantus_voice && ex.cantus_voice !== filters.cantus_voice) return false;
      if (filters.cf_id && ex.cantus_firmus.cf_id !== filters.cf_id) return false;
      if (typeof diff === "number" && ex.difficulty.value !== diff) return false;
      if (typeof diff === "object") {
        if (diff.min !== undefined && ex.difficulty.value < diff.min) return false;
        if (diff.max !== undefined && ex.difficulty.value > diff.max) return false;
      }
      return true;
    });
  }

  listCantusFirmi(options: { includeDistinctOnly?: boolean } = {}): CantusFirmus[] {
    return this.dataset.cantus_firmi.filter((cf) => options.includeDistinctOnly || cf.in_exercises);
  }

  /** The exercise as presented to the player: CF present, counterpoint voice empty. */
  getExercise(id: string): Exercise | undefined {
    return this.exercises.get(id);
  }

  getCantusFirmus(cfId: string): CantusFirmus | undefined {
    return this.cantusFirmi.get(cfId);
  }

  /** Fux's own solution (never a generated one). */
  getSolution(exerciseId: string): OriginalSolution | undefined {
    return this.solutions.get(exerciseId);
  }

  /** Interval annotations of Fux's solution, as given by the source. */
  getAnnotations(exerciseId: string): AnnotationSet | undefined {
    return this.annotations.get(exerciseId);
  }

  getExercisesForCantusFirmus(cfId: string): Exercise[] {
    return [...(this.byCf.get(cfId) ?? [])];
  }

  /** Uniformly random exercise among those matching `filters`; undefined if none match. */
  getRandomExercise(filters: ExerciseFilters = {}, random: () => number = Math.random): Exercise | undefined {
    const pool = this.listExercises(filters);
    if (pool.length === 0) return undefined;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
}
