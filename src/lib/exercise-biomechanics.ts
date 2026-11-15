/**
 * Moteur biomécanique pur (zéro dépendance DOM) pour les animations 3D / 2D des exercices FolloWeight.
 *
 * Conventions de repère (Three.js main droite) :
 * - Personnage orienté face à +Z, +Y vers le haut, +X = côté gauche du personnage, -X = côté droit.
 * - Spine / Chest / Neck pointent vers +Y au repos : rx > 0 penche en avant (+Z), rx < 0 en arrière.
 * - Bras & Jambes pendent vers -Y au repos : rx < 0 lève en avant (+Z), rx > 0 tire en arrière (-Z).
 *   Donc flexion du genou = knee.rx > 0 (jamais négatif).
 * - Abduction (rz) : sur le bras/jambe GAUCHE (+X), rz > 0 écarte vers l'extérieur ;
 *   sur le bras/jambe DROIT (-X), rz < 0 écarte vers l'extérieur.
 *
 * Sources ouvertes intégrées :
 * - Références poses mobilité/bureau : shlomorsh/desk-break (Licence MIT, Shlomy Reshef).
 * - Identifiants photos de référence : yuhonas/free-exercise-db (Domaine Public / Unlicense).
 */

import {
  CameraViewPreset,
  CoachPropType,
  ExerciseDefinition,
  MuscleGroupId,
} from "@/types/vitalpulse";

export type GroundMode = "standing" | "supine" | "prone_plank" | "all_fours" | "seated" | "hanging" | "dip_bars";

export type Vec3Deg = [number, number, number];

export interface JointPoseMap {
  hips: Vec3Deg;
  spine: Vec3Deg;
  chest: Vec3Deg;
  neck: Vec3Deg;
  shoulderL: Vec3Deg;
  shoulderR: Vec3Deg;
  elbowL: Vec3Deg;
  elbowR: Vec3Deg;
  hipL: Vec3Deg;
  hipR: Vec3Deg;
  kneeL: Vec3Deg;
  kneeR: Vec3Deg;
  ankleL: Vec3Deg;
  ankleR: Vec3Deg;
}

export interface KeyframePose {
  /** Fraction du cycle [0..1] */
  t: number;
  joints: Partial<JointPoseMap>;
  /** Déplacement relatif du bassin [x, y, z] en mètres (y géré principalement par liftY / groundMode) */
  hipsPos?: [number, number, number];
  /** Élévation volontaire au-dessus du sol (saut, traction, suspension foulée) en mètres */
  liftY?: number;
  /** Niveau de contraction musculaire [0..1] pour pulser les muscles principaux */
  contraction?: number;
  /** Indique la phase d'effort (concentrique) vs retour (excentrique) */
  concentric?: boolean;
}

export interface MovementArchetypeDef {
  groundMode: GroundMode;
  linearInterpolation?: boolean;
  keyframes: KeyframePose[];
}

export type MovementArchetypeId =
  | "shoulder_rolls_breath"
  | "wall_pushup"
  | "chair_sit_to_stand"
  | "stair_climb_burst"
  | "high_knee_march"
  | "shadow_boxing"
  | "brisk_walk"
  | "step_jack_no_jump"
  | "bodyweight_squat"
  | "plank_hold_breathing"
  | "mountain_climber_low"
  | "reverse_lunge"
  | "glute_bridge"
  | "bent_over_ytw_row"
  | "dead_bug_core"
  | "bird_dog_quadruped"
  | "side_plank_hold"
  | "seated_thoracic_twist"
  | "chest_door_open_stretch"
  | "kneeling_hip_flexor"
  | "cat_cow_spine"
  | "child_pose_breath"
  | "yoga_sun_flow"
  | "dance_cardio_groove"
  | "cycling_cadence"
  | "running_stride"
  | "swimming_crawl"
  | "calf_raise_balance"
  | "supine_twist_stretch"
  | "dumbbell_bench_press"
  | "overhead_shoulder_press"
  | "lateral_raise"
  | "triceps_pushdown_ext"
  | "pullup_lat"
  | "dumbbell_row"
  | "bicep_curl"
  | "barbell_squat"
  | "romanian_deadlift"
  | "parallel_bar_dips"
  | "rowing_ergometer"
  | "jump_rope"
  | "soccer_strike"
  | "racket_forehand"
  | "basketball_jumpshot"
  | "heavy_bag_boxing"
  | "martial_arts_guard_kick"
  | "kettlebell_thruster_wod"
  | "bouldering_climb"
  | "trail_hiking_incline";

export interface ExerciseMoveStep {
  id: string;
  labelFr: string;
  archetype: MovementArchetypeId;
  prop: CoachPropType;
  defaultCamera: CameraViewPreset;
  cycleSeconds: number;
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  breathingCue: {
    eccentric: string;
    concentric: string;
  };
  postureTips: string[];
  freeExerciseDbId?: string;
  deskBreakMitId?: string;
}

export interface ExerciseVisualSpec {
  exerciseId: string;
  movements: ExerciseMoveStep[];
}

export interface EvaluatedPose {
  joints: JointPoseMap;
  hipsPosOffset: [number, number, number];
  liftY: number;
  contraction01: number;
  isConcentric: boolean;
  groundMode: GroundMode;
  phase01: number;
}

export const MUSCLE_LABELS_FR: Record<MuscleGroupId, string> = {
  chest: "Pectoraux",
  upper_back: "Haut du dos & Omoplates",
  lats: "Grand dorsal",
  shoulders: "Épaules (Deltoïdes)",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Avant-bras & Grip",
  abs_core: "Sangle abdominale",
  obliques: "Obliques & Taille",
  lower_back: "Lombaires",
  glutes: "Fessiers",
  quads: "Quadriceps",
  hamstrings: "Ischio-jambiers",
  calves: "Mollets",
  hip_flexors: "Psoas & Hanches",
  neck_traps: "Nuque & Trapèzes",
  cardio_heart: "Cardio & Souffle",
};

const REST_JOINTS: JointPoseMap = {
  hips: [0, 0, 0],
  spine: [0, 0, 0],
  chest: [0, 0, 0],
  neck: [0, 0, 0],
  shoulderL: [0, 0, 6],
  shoulderR: [0, 0, -6],
  elbowL: [-6, 0, 0],
  elbowR: [-6, 0, 0],
  hipL: [0, 0, 2],
  hipR: [0, 0, -2],
  kneeL: [4, 0, 0],
  kneeR: [4, 0, 0],
  ankleL: [0, 0, 0],
  ankleR: [0, 0, 0],
};

function mergeJoints(partial?: Partial<JointPoseMap>): JointPoseMap {
  return {
    hips: partial?.hips ?? REST_JOINTS.hips,
    spine: partial?.spine ?? REST_JOINTS.spine,
    chest: partial?.chest ?? REST_JOINTS.chest,
    neck: partial?.neck ?? REST_JOINTS.neck,
    shoulderL: partial?.shoulderL ?? REST_JOINTS.shoulderL,
    shoulderR: partial?.shoulderR ?? REST_JOINTS.shoulderR,
    elbowL: partial?.elbowL ?? REST_JOINTS.elbowL,
    elbowR: partial?.elbowR ?? REST_JOINTS.elbowR,
    hipL: partial?.hipL ?? REST_JOINTS.hipL,
    hipR: partial?.hipR ?? REST_JOINTS.hipR,
    kneeL: partial?.kneeL ?? REST_JOINTS.kneeL,
    kneeR: partial?.kneeR ?? REST_JOINTS.kneeR,
    ankleL: partial?.ankleL ?? REST_JOINTS.ankleL,
    ankleR: partial?.ankleR ?? REST_JOINTS.ankleR,
  };
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3Deg, b: Vec3Deg, t: number): Vec3Deg {
  return [lerpNum(a[0], b[0], t), lerpNum(a[1], b[1], t), lerpNum(a[2], b[2], t)];
}

export const MOVEMENT_ARCHETYPES: Record<MovementArchetypeId, MovementArchetypeDef> = {
  shoulder_rolls_breath: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: { chest: [0, 0, 0], neck: [2, 0, 0], shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] },
        contraction: 0.25,
        concentric: true,
      },
      {
        t: 0.28,
        joints: { chest: [-6, 0, 0], neck: [-4, 0, 0], shoulderL: [-32, 0, 26], shoulderR: [-32, 0, -26], elbowL: [-28, 0, 0], elbowR: [-28, 0, 0] },
        contraction: 0.75,
        concentric: true,
      },
      {
        t: 0.55,
        joints: { chest: [-12, 0, 0], neck: [-6, 0, 0], shoulderL: [24, 0, 18], shoulderR: [24, 0, -18], elbowL: [-18, 0, 0], elbowR: [-18, 0, 0] },
        contraction: 0.9,
        concentric: false,
      },
      {
        t: 0.8,
        joints: { chest: [4, 0, 0], neck: [4, 0, 0], shoulderL: [14, 0, 8], shoulderR: [14, 0, -8], elbowL: [-8, 0, 0], elbowR: [-8, 0, 0] },
        contraction: 0.4,
        concentric: false,
      },
    ],
  },

  wall_pushup: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [-82, 0, 8],
          shoulderR: [-82, 0, -8],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-8, 0, 2],
          hipR: [-8, 0, -2],
          ankleL: [-8, 0, 0],
          ankleR: [-8, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [22, 0, 0],
          shoulderL: [-28, 0, 32],
          shoulderR: [-28, 0, -32],
          elbowL: [-92, 0, 0],
          elbowR: [-92, 0, 0],
          hipL: [-18, 0, 2],
          hipR: [-18, 0, -2],
          ankleL: [-14, 0, 0],
          ankleR: [-14, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  chair_sit_to_stand: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [2, 0, 0],
          spine: [4, 0, 0],
          shoulderL: [-10, 0, 8],
          shoulderR: [-10, 0, -8],
          elbowL: [-20, 0, 0],
          elbowR: [-20, 0, 0],
          hipL: [-4, 0, 4],
          hipR: [-4, 0, -4],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [18, 0, 0],
          spine: [12, 0, 0],
          shoulderL: [-68, 0, 8],
          shoulderR: [-68, 0, -8],
          elbowL: [-18, 0, 0],
          elbowR: [-18, 0, 0],
          hipL: [-92, 0, 6],
          hipR: [-92, 0, -6],
          kneeL: [92, 0, 0],
          kneeR: [92, 0, 0],
          ankleL: [-16, 0, 0],
          ankleR: [-16, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  stair_climb_burst: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, 0, 0],
          spine: [6, 0, 0],
          shoulderL: [-45, 0, 8],
          shoulderR: [28, 0, -8],
          elbowL: [-80, 0, 0],
          elbowR: [-75, 0, 0],
          hipL: [-10, 0, 2],
          hipR: [-75, 0, -2],
          kneeL: [14, 0, 0],
          kneeR: [84, 0, 0],
        },
        liftY: 0,
        contraction: 0.75,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [10, 0, 0],
          spine: [6, 0, 0],
          shoulderL: [10, 0, 8],
          shoulderR: [-10, 0, -8],
          elbowL: [-78, 0, 0],
          elbowR: [-78, 0, 0],
          hipL: [18, 0, 2],
          hipR: [-38, 0, -2],
          kneeL: [18, 0, 0],
          kneeR: [42, 0, 0],
        },
        liftY: 0.14,
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [10, 0, 0],
          spine: [6, 0, 0],
          shoulderL: [28, 0, 8],
          shoulderR: [-45, 0, -8],
          elbowL: [-75, 0, 0],
          elbowR: [-80, 0, 0],
          hipL: [-75, 0, 2],
          hipR: [-10, 0, -2],
          kneeL: [84, 0, 0],
          kneeR: [14, 0, 0],
        },
        liftY: 0,
        contraction: 0.75,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [10, 0, 0],
          spine: [6, 0, 0],
          shoulderL: [-10, 0, 8],
          shoulderR: [10, 0, -8],
          elbowL: [-78, 0, 0],
          elbowR: [-78, 0, 0],
          hipL: [-38, 0, 2],
          hipR: [18, 0, -2],
          kneeL: [42, 0, 0],
          kneeR: [18, 0, 0],
        },
        liftY: 0.14,
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  high_knee_march: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [-52, 0, 10],
          shoulderR: [24, 0, -10],
          elbowL: [-82, 0, 0],
          elbowR: [-72, 0, 0],
          hipL: [6, 0, 2],
          hipR: [-88, 0, -2],
          kneeL: [8, 0, 0],
          kneeR: [95, 0, 0],
        },
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          shoulderL: [-8, 0, 10],
          shoulderR: [-8, 0, -10],
          elbowL: [-76, 0, 0],
          elbowR: [-76, 0, 0],
          hipL: [-18, 0, 2],
          hipR: [-18, 0, -2],
          kneeL: [18, 0, 0],
          kneeR: [18, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          shoulderL: [24, 0, 10],
          shoulderR: [-52, 0, -10],
          elbowL: [-72, 0, 0],
          elbowR: [-82, 0, 0],
          hipL: [-88, 0, 2],
          hipR: [6, 0, -2],
          kneeL: [95, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          shoulderL: [-8, 0, 10],
          shoulderR: [-8, 0, -10],
          elbowL: [-76, 0, 0],
          elbowR: [-76, 0, 0],
          hipL: [-18, 0, 2],
          hipR: [-18, 0, -2],
          kneeL: [18, 0, 0],
          kneeR: [18, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
    ],
  },

  shadow_boxing: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [6, -24, 0],
          chest: [4, 10, 0],
          shoulderL: [-52, -10, 12],
          shoulderR: [-48, 12, -12],
          elbowL: [-105, 0, 0],
          elbowR: [-110, 0, 0],
          hipL: [-28, 0, 6],
          hipR: [18, 0, -6],
          kneeL: [28, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.25,
        joints: {
          hips: [8, -12, 0],
          chest: [6, -18, 0],
          shoulderL: [-88, 0, 6],
          shoulderR: [-50, 10, -12],
          elbowL: [-8, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-32, 0, 6],
          hipR: [20, 0, -6],
          kneeL: [30, 0, 0],
          kneeR: [26, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [6, -24, 0],
          chest: [4, 8, 0],
          shoulderL: [-52, -10, 12],
          shoulderR: [-48, 12, -12],
          elbowL: [-105, 0, 0],
          elbowR: [-110, 0, 0],
          hipL: [-28, 0, 6],
          hipR: [18, 0, -6],
          kneeL: [28, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [10, 18, 0],
          chest: [8, 22, 0],
          shoulderL: [-50, -8, 14],
          shoulderR: [-90, 0, -6],
          elbowL: [-108, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-26, 0, 6],
          hipR: [16, 0, -6],
          kneeL: [26, 0, 0],
          kneeR: [22, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  brisk_walk: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [4, 4, 0],
          chest: [0, -6, 0],
          shoulderL: [26, 0, 8],
          shoulderR: [-32, 0, -8],
          elbowL: [-68, 0, 0],
          elbowR: [-76, 0, 0],
          hipL: [-26, 0, 2],
          hipR: [22, 0, -2],
          kneeL: [10, 0, 0],
          kneeR: [22, 0, 0],
          ankleL: [-10, 0, 0],
          ankleR: [18, 0, 0],
        },
        contraction: 0.65,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [0, 0, 8],
          shoulderR: [0, 0, -8],
          elbowL: [-72, 0, 0],
          elbowR: [-72, 0, 0],
          hipL: [-4, 0, 2],
          hipR: [-10, 0, -2],
          kneeL: [8, 0, 0],
          kneeR: [36, 0, 0],
        },
        liftY: 0.02,
        contraction: 0.45,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [4, -4, 0],
          chest: [0, 6, 0],
          shoulderL: [-32, 0, 8],
          shoulderR: [26, 0, -8],
          elbowL: [-76, 0, 0],
          elbowR: [-68, 0, 0],
          hipL: [22, 0, 2],
          hipR: [-26, 0, -2],
          kneeL: [22, 0, 0],
          kneeR: [10, 0, 0],
          ankleL: [18, 0, 0],
          ankleR: [-10, 0, 0],
        },
        contraction: 0.65,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [0, 0, 8],
          shoulderR: [0, 0, -8],
          elbowL: [-72, 0, 0],
          elbowR: [-72, 0, 0],
          hipL: [-10, 0, 2],
          hipR: [-4, 0, -2],
          kneeL: [36, 0, 0],
          kneeR: [8, 0, 0],
        },
        liftY: 0.02,
        contraction: 0.45,
        concentric: false,
      },
    ],
  },

  step_jack_no_jump: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [0, 0, 12],
          shoulderR: [0, 0, -12],
          elbowL: [-14, 0, 0],
          elbowR: [-14, 0, 0],
          hipL: [0, 0, 2],
          hipR: [0, 0, -2],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.25,
        joints: {
          shoulderL: [-20, 0, 148],
          shoulderR: [-20, 0, -148],
          elbowL: [-18, 0, 0],
          elbowR: [-18, 0, 0],
          hipL: [-8, 0, 26],
          hipR: [-4, 0, -4],
          kneeL: [16, 0, 0],
          kneeR: [14, 0, 0],
        },
        hipsPos: [0.16, 0, 0],
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          shoulderL: [0, 0, 12],
          shoulderR: [0, 0, -12],
          elbowL: [-14, 0, 0],
          elbowR: [-14, 0, 0],
          hipL: [0, 0, 2],
          hipR: [0, 0, -2],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          shoulderL: [-20, 0, 148],
          shoulderR: [-20, 0, -148],
          elbowL: [-18, 0, 0],
          elbowR: [-18, 0, 0],
          hipL: [-4, 0, 4],
          hipR: [-8, 0, -26],
          kneeL: [14, 0, 0],
          kneeR: [16, 0, 0],
        },
        hipsPos: [-0.16, 0, 0],
        contraction: 0.9,
        concentric: true,
      },
    ],
  },

  bodyweight_squat: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-22, 0, 10],
          shoulderR: [-22, 0, -10],
          elbowL: [-25, 0, 0],
          elbowR: [-25, 0, 0],
          hipL: [-6, 0, 7],
          hipR: [-6, 0, -7],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [24, 0, 0],
          spine: [10, 0, 0],
          shoulderL: [-82, 0, 12],
          shoulderR: [-82, 0, -12],
          elbowL: [-14, 0, 0],
          elbowR: [-14, 0, 0],
          hipL: [-112, 0, 12],
          hipR: [-112, 0, -12],
          kneeL: [106, 0, 0],
          kneeR: [106, 0, 0],
          ankleL: [-18, 0, 0],
          ankleR: [-18, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  plank_hold_breathing: {
    groundMode: "prone_plank",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [76, 0, 0],
          spine: [2, 0, 0],
          neck: [-12, 0, 0],
          shoulderL: [-76, 0, 6],
          shoulderR: [-76, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [0, 0, 3],
          hipR: [0, 0, -3],
          kneeL: [4, 0, 0],
          kneeR: [4, 0, 0],
        },
        contraction: 0.72,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [78, 0, 0],
          spine: [-3, 0, 0],
          neck: [-10, 0, 0],
          shoulderL: [-78, 0, 6],
          shoulderR: [-78, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [0, 0, 3],
          hipR: [0, 0, -3],
          kneeL: [4, 0, 0],
          kneeR: [4, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  mountain_climber_low: {
    groundMode: "prone_plank",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [76, 0, 0],
          neck: [-16, 0, 0],
          shoulderL: [-76, 0, 8],
          shoulderR: [-76, 0, -8],
          hipL: [-82, 0, 4],
          hipR: [0, 0, -4],
          kneeL: [92, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.92,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [76, 0, 0],
          neck: [-16, 0, 0],
          shoulderL: [-76, 0, 8],
          shoulderR: [-76, 0, -8],
          hipL: [-30, 0, 4],
          hipR: [-30, 0, -4],
          kneeL: [40, 0, 0],
          kneeR: [40, 0, 0],
        },
        contraction: 0.55,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [76, 0, 0],
          neck: [-16, 0, 0],
          shoulderL: [-76, 0, 8],
          shoulderR: [-76, 0, -8],
          hipL: [0, 0, 4],
          hipR: [-82, 0, -4],
          kneeL: [8, 0, 0],
          kneeR: [92, 0, 0],
        },
        contraction: 0.92,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          hips: [76, 0, 0],
          neck: [-16, 0, 0],
          shoulderL: [-76, 0, 8],
          shoulderR: [-76, 0, -8],
          hipL: [-30, 0, 4],
          hipR: [-30, 0, -4],
          kneeL: [40, 0, 0],
          kneeR: [40, 0, 0],
        },
        contraction: 0.55,
        concentric: false,
      },
    ],
  },

  reverse_lunge: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [-12, 0, 10],
          shoulderR: [-12, 0, -10],
          elbowL: [-30, 0, 0],
          elbowR: [-30, 0, 0],
          hipL: [-4, 0, 4],
          hipR: [-4, 0, -4],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.25,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [-35, 0, 12],
          shoulderR: [-35, 0, -12],
          elbowL: [-75, 0, 0],
          elbowR: [-75, 0, 0],
          hipL: [-92, 0, 4],
          hipR: [28, 0, -4],
          kneeL: [92, 0, 0],
          kneeR: [86, 0, 0],
        },
        contraction: 0.96,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          shoulderL: [-12, 0, 10],
          shoulderR: [-12, 0, -10],
          elbowL: [-30, 0, 0],
          elbowR: [-30, 0, 0],
          hipL: [-4, 0, 4],
          hipR: [-4, 0, -4],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [-35, 0, 12],
          shoulderR: [-35, 0, -12],
          elbowL: [-75, 0, 0],
          elbowR: [-75, 0, 0],
          hipL: [28, 0, 4],
          hipR: [-92, 0, -4],
          kneeL: [86, 0, 0],
          kneeR: [92, 0, 0],
        },
        contraction: 0.96,
        concentric: true,
      },
    ],
  },

  glute_bridge: {
    groundMode: "supine",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [-90, 0, 0],
          neck: [12, 0, 0],
          shoulderL: [4, 0, 16],
          shoulderR: [4, 0, -16],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-62, 0, 6],
          hipR: [-62, 0, -6],
          kneeL: [112, 0, 0],
          kneeR: [112, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [-66, 0, 0],
          spine: [-6, 0, 0],
          neck: [4, 0, 0],
          shoulderL: [-18, 0, 16],
          shoulderR: [-18, 0, -16],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-22, 0, 6],
          hipR: [-22, 0, -6],
          kneeL: [98, 0, 0],
          kneeR: [98, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  bent_over_ytw_row: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [36, 0, 0],
          spine: [10, 0, 0],
          neck: [-20, 0, 0],
          shoulderL: [-40, 0, 8],
          shoulderR: [-40, 0, -8],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-42, 0, 5],
          hipR: [-42, 0, -5],
          kneeL: [24, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [36, 0, 0],
          spine: [-6, 0, 0],
          chest: [-8, 0, 0],
          neck: [-18, 0, 0],
          shoulderL: [-95, 0, 48],
          shoulderR: [-95, 0, -48],
          elbowL: [-14, 0, 0],
          elbowR: [-14, 0, 0],
          hipL: [-42, 0, 5],
          hipR: [-42, 0, -5],
          kneeL: [24, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.96,
        concentric: true,
      },
    ],
  },

  dead_bug_core: {
    groundMode: "supine",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [-90, 0, 0],
          neck: [8, 0, 0],
          shoulderL: [-90, 0, 6],
          shoulderR: [-90, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [-90, 0, 4],
          hipR: [-90, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.45,
        concentric: false,
      },
      {
        t: 0.25,
        joints: {
          hips: [-90, 0, 0],
          neck: [8, 0, 0],
          shoulderL: [-168, 0, 6],
          shoulderR: [-90, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [-90, 0, 4],
          hipR: [-12, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [10, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [-90, 0, 0],
          neck: [8, 0, 0],
          shoulderL: [-90, 0, 6],
          shoulderR: [-90, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [-90, 0, 4],
          hipR: [-90, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.45,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [-90, 0, 0],
          neck: [8, 0, 0],
          shoulderL: [-90, 0, 6],
          shoulderR: [-168, 0, -6],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [-12, 0, 4],
          hipR: [-90, 0, -4],
          kneeL: [10, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  bird_dog_quadruped: {
    groundMode: "all_fours",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [88, 0, 0],
          neck: [-25, 0, 0],
          shoulderL: [-88, 0, 4],
          shoulderR: [-88, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-88, 0, 4],
          hipR: [-88, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.4,
        concentric: false,
      },
      {
        t: 0.25,
        joints: {
          hips: [88, 0, 0],
          neck: [-25, 0, 0],
          shoulderL: [-174, 0, 4],
          shoulderR: [-88, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-88, 0, 4],
          hipR: [-4, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [88, 0, 0],
          neck: [-25, 0, 0],
          shoulderL: [-88, 0, 4],
          shoulderR: [-88, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-88, 0, 4],
          hipR: [-88, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.4,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [88, 0, 0],
          neck: [-25, 0, 0],
          shoulderL: [-88, 0, 4],
          shoulderR: [-174, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-4, 0, 4],
          hipR: [-88, 0, -4],
          kneeL: [6, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  side_plank_hold: {
    groundMode: "prone_plank",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [0, 0, 74],
          spine: [0, 0, -4],
          shoulderL: [-20, 0, 12],
          shoulderR: [0, 0, -82],
          elbowL: [-10, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [0, 0, 2],
          hipR: [0, 0, -2],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.78,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [0, 0, 70],
          spine: [0, 0, -10],
          shoulderL: [-10, 0, 145],
          shoulderR: [0, 0, -82],
          elbowL: [-8, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [0, 0, 4],
          hipR: [0, 0, -2],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.96,
        concentric: true,
      },
    ],
  },

  seated_thoracic_twist: {
    groundMode: "seated",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [0, 0, 0],
          spine: [0, -24, 0],
          chest: [0, -18, 0],
          neck: [0, -16, 0],
          shoulderL: [-55, -20, 20],
          shoulderR: [-55, 20, -20],
          elbowL: [-95, 0, 0],
          elbowR: [-95, 0, 0],
          hipL: [-88, 0, 4],
          hipR: [-88, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.85,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [0, 0, 0],
          spine: [0, 24, 0],
          chest: [0, 18, 0],
          neck: [0, 16, 0],
          shoulderL: [-55, -20, 20],
          shoulderR: [-55, 20, -20],
          elbowL: [-95, 0, 0],
          elbowR: [-95, 0, 0],
          hipL: [-88, 0, 4],
          hipR: [-88, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.85,
        concentric: false,
      },
    ],
  },

  chest_door_open_stretch: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          chest: [2, 0, 0],
          shoulderL: [-42, 0, 48],
          shoulderR: [-42, 0, -48],
          elbowL: [-80, 0, 0],
          elbowR: [-80, 0, 0],
          hipL: [-14, 0, 4],
          hipR: [12, 0, -4],
          kneeL: [18, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          chest: [-14, 0, 0],
          neck: [-6, 0, 0],
          shoulderL: [14, 0, 82],
          shoulderR: [14, 0, -82],
          elbowL: [-86, 0, 0],
          elbowR: [-86, 0, 0],
          hipL: [-22, 0, 4],
          hipR: [16, 0, -4],
          kneeL: [24, 0, 0],
          kneeR: [10, 0, 0],
        },
        contraction: 0.92,
        concentric: true,
      },
    ],
  },

  kneeling_hip_flexor: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-25, 0, 12],
          shoulderR: [-25, 0, -12],
          elbowL: [-40, 0, 0],
          elbowR: [-40, 0, 0],
          hipL: [-82, 0, 4],
          hipR: [18, 0, -4],
          kneeL: [82, 0, 0],
          kneeR: [95, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [6, 0, 0],
          chest: [-10, 0, 0],
          shoulderL: [-145, 0, 14],
          shoulderR: [-145, 0, -14],
          elbowL: [-12, 0, 0],
          elbowR: [-12, 0, 0],
          hipL: [-98, 0, 4],
          hipR: [36, 0, -4],
          kneeL: [98, 0, 0],
          kneeR: [82, 0, 0],
        },
        contraction: 0.94,
        concentric: true,
      },
    ],
  },

  cat_cow_spine: {
    groundMode: "all_fours",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [96, 0, 0],
          spine: [24, 0, 0],
          chest: [18, 0, 0],
          neck: [26, 0, 0],
          shoulderL: [-122, 0, 4],
          shoulderR: [-122, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-96, 0, 4],
          hipR: [-96, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.85,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [80, 0, 0],
          spine: [-20, 0, 0],
          chest: [-16, 0, 0],
          neck: [-28, 0, 0],
          shoulderL: [-62, 0, 4],
          shoulderR: [-62, 0, -4],
          elbowL: [-4, 0, 0],
          elbowR: [-4, 0, 0],
          hipL: [-80, 0, 4],
          hipR: [-80, 0, -4],
          kneeL: [90, 0, 0],
          kneeR: [90, 0, 0],
        },
        contraction: 0.85,
        concentric: false,
      },
    ],
  },

  child_pose_breath: {
    groundMode: "all_fours",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [48, 0, 0],
          spine: [18, 0, 0],
          neck: [18, 0, 0],
          shoulderL: [-142, 0, 8],
          shoulderR: [-142, 0, -8],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-125, 0, 12],
          hipR: [-125, 0, -12],
          kneeL: [132, 0, 0],
          kneeR: [132, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [52, 0, 0],
          spine: [14, 0, 0],
          neck: [14, 0, 0],
          shoulderL: [-150, 0, 8],
          shoulderR: [-150, 0, -8],
          elbowL: [-6, 0, 0],
          elbowR: [-6, 0, 0],
          hipL: [-128, 0, 12],
          hipR: [-128, 0, -12],
          kneeL: [134, 0, 0],
          kneeR: [134, 0, 0],
        },
        contraction: 0.7,
        concentric: true,
      },
    ],
  },

  yoga_sun_flow: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          chest: [-10, 0, 0],
          neck: [-14, 0, 0],
          shoulderL: [-168, 0, 14],
          shoulderR: [-168, 0, -14],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.7,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [68, 0, 0],
          spine: [20, 0, 0],
          neck: [20, 0, 0],
          shoulderL: [-92, 0, 10],
          shoulderR: [-92, 0, -10],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-64, 0, 5],
          hipR: [-64, 0, -5],
          kneeL: [24, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.85,
        concentric: false,
      },
    ],
  },

  dance_cardio_groove: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [8, 10, -6],
          chest: [0, -14, 8],
          shoulderL: [-52, 0, 42],
          shoulderR: [-38, 0, -25],
          elbowL: [-85, 0, 0],
          elbowR: [-95, 0, 0],
          hipL: [-18, 0, 14],
          hipR: [-6, 0, -4],
          kneeL: [24, 0, 0],
          kneeR: [12, 0, 0],
        },
        hipsPos: [0.12, 0, 0],
        liftY: 0.03,
        contraction: 0.85,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-28, 0, 20],
          shoulderR: [-28, 0, -20],
          elbowL: [-70, 0, 0],
          elbowR: [-70, 0, 0],
          kneeL: [28, 0, 0],
          kneeR: [28, 0, 0],
        },
        liftY: 0,
        contraction: 0.45,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [8, -10, 6],
          chest: [0, 14, -8],
          shoulderL: [-38, 0, 25],
          shoulderR: [-52, 0, -42],
          elbowL: [-95, 0, 0],
          elbowR: [-85, 0, 0],
          hipL: [-6, 0, 4],
          hipR: [-18, 0, -14],
          kneeL: [12, 0, 0],
          kneeR: [24, 0, 0],
        },
        hipsPos: [-0.12, 0, 0],
        liftY: 0.03,
        contraction: 0.85,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-28, 0, 20],
          shoulderR: [-28, 0, -20],
          elbowL: [-70, 0, 0],
          elbowR: [-70, 0, 0],
          kneeL: [28, 0, 0],
          kneeR: [28, 0, 0],
        },
        liftY: 0,
        contraction: 0.45,
        concentric: false,
      },
    ],
  },

  cycling_cadence: {
    groundMode: "seated",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [22, 0, 0],
          spine: [10, 0, 0],
          neck: [-22, 0, 0],
          shoulderL: [-68, 0, 10],
          shoulderR: [-68, 0, -10],
          elbowL: [-22, 0, 0],
          elbowR: [-22, 0, 0],
          hipL: [-98, 0, 4],
          hipR: [-38, 0, -4],
          kneeL: [104, 0, 0],
          kneeR: [36, 0, 0],
        },
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [22, 0, 0],
          spine: [10, 0, 0],
          neck: [-22, 0, 0],
          shoulderL: [-68, 0, 10],
          shoulderR: [-68, 0, -10],
          elbowL: [-22, 0, 0],
          elbowR: [-22, 0, 0],
          hipL: [-74, 0, 4],
          hipR: [-74, 0, -4],
          kneeL: [74, 0, 0],
          kneeR: [74, 0, 0],
        },
        contraction: 0.65,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [22, 0, 0],
          spine: [10, 0, 0],
          neck: [-22, 0, 0],
          shoulderL: [-68, 0, 10],
          shoulderR: [-68, 0, -10],
          elbowL: [-22, 0, 0],
          elbowR: [-22, 0, 0],
          hipL: [-38, 0, 4],
          hipR: [-98, 0, -4],
          kneeL: [36, 0, 0],
          kneeR: [104, 0, 0],
        },
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          hips: [22, 0, 0],
          spine: [10, 0, 0],
          neck: [-22, 0, 0],
          shoulderL: [-68, 0, 10],
          shoulderR: [-68, 0, -10],
          elbowL: [-22, 0, 0],
          elbowR: [-22, 0, 0],
          hipL: [-74, 0, 4],
          hipR: [-74, 0, -4],
          kneeL: [74, 0, 0],
          kneeR: [74, 0, 0],
        },
        contraction: 0.65,
        concentric: false,
      },
    ],
  },

  running_stride: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, 4, 0],
          chest: [4, -10, 0],
          shoulderL: [36, 0, 8],
          shoulderR: [-52, 0, -8],
          elbowL: [-92, 0, 0],
          elbowR: [-86, 0, 0],
          hipL: [-62, 0, 2],
          hipR: [32, 0, -2],
          kneeL: [58, 0, 0],
          kneeR: [42, 0, 0],
          ankleL: [-12, 0, 0],
          ankleR: [24, 0, 0],
        },
        liftY: 0.04,
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [0, 0, 8],
          shoulderR: [0, 0, -8],
          elbowL: [-88, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [-16, 0, 2],
          hipR: [-10, 0, -2],
          kneeL: [24, 0, 0],
          kneeR: [88, 0, 0],
        },
        liftY: 0,
        contraction: 0.6,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [10, -4, 0],
          chest: [4, 10, 0],
          shoulderL: [-52, 0, 8],
          shoulderR: [36, 0, -8],
          elbowL: [-86, 0, 0],
          elbowR: [-92, 0, 0],
          hipL: [32, 0, 2],
          hipR: [-62, 0, -2],
          kneeL: [42, 0, 0],
          kneeR: [58, 0, 0],
          ankleL: [24, 0, 0],
          ankleR: [-12, 0, 0],
        },
        liftY: 0.04,
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.75,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [0, 0, 8],
          shoulderR: [0, 0, -8],
          elbowL: [-88, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [-10, 0, 2],
          hipR: [-16, 0, -2],
          kneeL: [88, 0, 0],
          kneeR: [24, 0, 0],
        },
        liftY: 0,
        contraction: 0.6,
        concentric: false,
      },
    ],
  },

  swimming_crawl: {
    groundMode: "prone_plank",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [86, 0, 12],
          chest: [0, 14, 0],
          neck: [-12, -16, 0],
          shoulderL: [-165, 0, 14],
          shoulderR: [12, 0, -18],
          elbowL: [-12, 0, 0],
          elbowR: [-36, 0, 0],
          hipL: [-14, 0, 3],
          hipR: [14, 0, -3],
          kneeL: [14, 0, 0],
          kneeR: [6, 0, 0],
          ankleL: [30, 0, 0],
          ankleR: [30, 0, 0],
        },
        liftY: 0.55,
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.25,
        joints: {
          hips: [86, 0, 0],
          chest: [0, 0, 0],
          neck: [-18, 0, 0],
          shoulderL: [-72, 0, 12],
          shoulderR: [-86, 0, -68],
          elbowL: [-54, 0, 0],
          elbowR: [-72, 0, 0],
          hipL: [14, 0, 3],
          hipR: [-14, 0, -3],
          kneeL: [6, 0, 0],
          kneeR: [14, 0, 0],
          ankleL: [30, 0, 0],
          ankleR: [30, 0, 0],
        },
        liftY: 0.55,
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [86, 0, -12],
          chest: [0, -14, 0],
          neck: [-12, 16, 0],
          shoulderL: [12, 0, 18],
          shoulderR: [-165, 0, -14],
          elbowL: [-36, 0, 0],
          elbowR: [-12, 0, 0],
          hipL: [-14, 0, 3],
          hipR: [14, 0, -3],
          kneeL: [14, 0, 0],
          kneeR: [6, 0, 0],
          ankleL: [30, 0, 0],
          ankleR: [30, 0, 0],
        },
        liftY: 0.55,
        contraction: 0.9,
        concentric: false,
      },
      {
        t: 0.75,
        joints: {
          hips: [86, 0, 0],
          chest: [0, 0, 0],
          neck: [-18, 0, 0],
          shoulderL: [-86, 0, 68],
          shoulderR: [-72, 0, -12],
          elbowL: [-72, 0, 0],
          elbowR: [-54, 0, 0],
          hipL: [14, 0, 3],
          hipR: [-14, 0, -3],
          kneeL: [6, 0, 0],
          kneeR: [14, 0, 0],
          ankleL: [30, 0, 0],
          ankleR: [30, 0, 0],
        },
        liftY: 0.55,
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  calf_raise_balance: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [-10, 0, 14],
          shoulderR: [-10, 0, -14],
          elbowL: [-22, 0, 0],
          elbowR: [-22, 0, 0],
          hipL: [-2, 0, 4],
          hipR: [-2, 0, -4],
          kneeL: [4, 0, 0],
          kneeR: [4, 0, 0],
          ankleL: [0, 0, 0],
          ankleR: [0, 0, 0],
        },
        liftY: 0,
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          shoulderL: [-16, 0, 26],
          shoulderR: [-16, 0, -26],
          elbowL: [-20, 0, 0],
          elbowR: [-20, 0, 0],
          hipL: [-2, 0, 4],
          hipR: [-2, 0, -4],
          kneeL: [4, 0, 0],
          kneeR: [4, 0, 0],
          ankleL: [36, 0, 0],
          ankleR: [36, 0, 0],
        },
        liftY: 0.08,
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  supine_twist_stretch: {
    groundMode: "supine",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [-90, 0, -24],
          chest: [0, 0, 24],
          neck: [0, -20, 0],
          shoulderL: [-15, 0, 82],
          shoulderR: [-15, 0, -82],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-82, 0, 4],
          hipR: [-82, 0, -4],
          kneeL: [96, 0, 0],
          kneeR: [96, 0, 0],
        },
        contraction: 0.8,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [-90, 0, 24],
          chest: [0, 0, -24],
          neck: [0, 20, 0],
          shoulderL: [-15, 0, 82],
          shoulderR: [-15, 0, -82],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-82, 0, 4],
          hipR: [-82, 0, -4],
          kneeL: [96, 0, 0],
          kneeR: [96, 0, 0],
        },
        contraction: 0.8,
        concentric: false,
      },
    ],
  },

  dumbbell_bench_press: {
    groundMode: "seated",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [-90, 0, 0],
          shoulderL: [-90, 0, 10],
          shoulderR: [-90, 0, -10],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-80, 0, 8],
          hipR: [-80, 0, -8],
          kneeL: [104, 0, 0],
          kneeR: [104, 0, 0],
        },
        contraction: 0.96,
        concentric: true,
      },
      {
        t: 0.52,
        joints: {
          hips: [-90, 0, 0],
          shoulderL: [10, 0, 74],
          shoulderR: [10, 0, -74],
          elbowL: [-88, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [-80, 0, 8],
          hipR: [-80, 0, -8],
          kneeL: [104, 0, 0],
          kneeR: [104, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
    ],
  },

  overhead_shoulder_press: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [-28, 0, 72],
          shoulderR: [-28, 0, -72],
          elbowL: [-95, 0, 0],
          elbowR: [-95, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          chest: [-4, 0, 0],
          shoulderL: [-168, 0, 14],
          shoulderR: [-168, 0, -14],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  lateral_raise: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [6, 0, 0],
          shoulderL: [-8, 0, 14],
          shoulderR: [-8, 0, -14],
          elbowL: [-18, 0, 0],
          elbowR: [-18, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.22,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          hips: [8, 0, 0],
          shoulderL: [-16, 0, 88],
          shoulderR: [-16, 0, -88],
          elbowL: [-20, 0, 0],
          elbowR: [-20, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  triceps_pushdown_ext: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [-12, 0, 10],
          shoulderR: [-12, 0, -10],
          elbowL: [-112, 0, 0],
          elbowR: [-112, 0, 0],
          kneeL: [14, 0, 0],
          kneeR: [14, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [12, 0, 0],
          shoulderL: [4, 0, 10],
          shoulderR: [4, 0, -10],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          kneeL: [14, 0, 0],
          kneeR: [14, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  pullup_lat: {
    groundMode: "hanging",
    keyframes: [
      {
        t: 0,
        joints: {
          chest: [-4, 0, 0],
          neck: [-10, 0, 0],
          shoulderL: [-168, 0, 18],
          shoulderR: [-168, 0, -18],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [6, 0, 3],
          hipR: [6, 0, -3],
          kneeL: [28, 0, 0],
          kneeR: [28, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          chest: [-14, 0, 0],
          neck: [-16, 0, 0],
          shoulderL: [-42, 0, 52],
          shoulderR: [-42, 0, -52],
          elbowL: [-122, 0, 0],
          elbowR: [-122, 0, 0],
          hipL: [8, 0, 3],
          hipR: [8, 0, -3],
          kneeL: [42, 0, 0],
          kneeR: [42, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  dumbbell_row: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [36, 0, 0],
          spine: [6, 0, 0],
          neck: [-22, 0, 0],
          shoulderL: [-46, 0, 10],
          shoulderR: [-46, 0, -10],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-42, 0, 6],
          hipR: [-42, 0, -6],
          kneeL: [28, 0, 0],
          kneeR: [28, 0, 0],
        },
        contraction: 0.25,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [36, 0, 0],
          spine: [-4, 0, 0],
          chest: [-6, 0, 0],
          neck: [-20, 0, 0],
          shoulderL: [24, 0, 18],
          shoulderR: [24, 0, -18],
          elbowL: [-102, 0, 0],
          elbowR: [-102, 0, 0],
          hipL: [-42, 0, 6],
          hipR: [-42, 0, -6],
          kneeL: [28, 0, 0],
          kneeR: [28, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  bicep_curl: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          shoulderL: [-4, 0, 12],
          shoulderR: [-4, 0, -12],
          elbowL: [-14, 0, 0],
          elbowR: [-14, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.2,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          shoulderL: [-18, 0, 12],
          shoulderR: [-18, 0, -12],
          elbowL: [-126, 0, 0],
          elbowR: [-126, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  barbell_squat: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [6, 0, 0],
          chest: [-6, 0, 0],
          shoulderL: [-28, 0, 64],
          shoulderR: [-28, 0, -64],
          elbowL: [-112, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-6, 0, 8],
          hipR: [-6, 0, -8],
          kneeL: [10, 0, 0],
          kneeR: [10, 0, 0],
        },
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.5,
        joints: {
          hips: [28, 0, 0],
          spine: [6, 0, 0],
          chest: [-6, 0, 0],
          neck: [-14, 0, 0],
          shoulderL: [-28, 0, 64],
          shoulderR: [-28, 0, -64],
          elbowL: [-112, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-116, 0, 14],
          hipR: [-116, 0, -14],
          kneeL: [110, 0, 0],
          kneeR: [110, 0, 0],
          ankleL: [-22, 0, 0],
          ankleR: [-22, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  romanian_deadlift: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [6, 0, 0],
          shoulderL: [-8, 0, 12],
          shoulderR: [-8, 0, -12],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-8, 0, 6],
          hipR: [-8, 0, -6],
          kneeL: [14, 0, 0],
          kneeR: [14, 0, 0],
        },
        contraction: 0.35,
        concentric: true,
      },
      {
        t: 0.52,
        joints: {
          hips: [68, 0, 0],
          spine: [4, 0, 0],
          neck: [-26, 0, 0],
          shoulderL: [-72, 0, 8],
          shoulderR: [-72, 0, -8],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-76, 0, 6],
          hipR: [-76, 0, -6],
          kneeL: [22, 0, 0],
          kneeR: [22, 0, 0],
          ankleL: [-8, 0, 0],
          ankleR: [-8, 0, 0],
        },
        contraction: 0.96,
        concentric: false,
      },
    ],
  },

  parallel_bar_dips: {
    groundMode: "dip_bars",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, 0, 0],
          shoulderL: [6, 0, 16],
          shoulderR: [6, 0, -16],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [4, 0, 4],
          hipR: [4, 0, -4],
          kneeL: [54, 0, 0],
          kneeR: [54, 0, 0],
        },
        contraction: 0.9,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [22, 0, 0],
          shoulderL: [56, 0, 26],
          shoulderR: [56, 0, -26],
          elbowL: [-98, 0, 0],
          elbowR: [-98, 0, 0],
          hipL: [10, 0, 4],
          hipR: [10, 0, -4],
          kneeL: [64, 0, 0],
          kneeR: [64, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
    ],
  },

  rowing_ergometer: {
    groundMode: "seated",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [20, 0, 0],
          spine: [10, 0, 0],
          neck: [-14, 0, 0],
          shoulderL: [-92, 0, 10],
          shoulderR: [-92, 0, -10],
          elbowL: [-8, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-116, 0, 5],
          hipR: [-116, 0, -5],
          kneeL: [108, 0, 0],
          kneeR: [108, 0, 0],
        },
        hipsPos: [0, 0, 0.24],
        contraction: 0.3,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          hips: [-16, 0, 0],
          chest: [-8, 0, 0],
          neck: [14, 0, 0],
          shoulderL: [24, 0, 20],
          shoulderR: [24, 0, -20],
          elbowL: [-102, 0, 0],
          elbowR: [-102, 0, 0],
          hipL: [-68, 0, 5],
          hipR: [-68, 0, -5],
          kneeL: [12, 0, 0],
          kneeR: [12, 0, 0],
        },
        hipsPos: [0, 0, -0.24],
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  jump_rope: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-16, 0, 26],
          shoulderR: [-16, 0, -26],
          elbowL: [-76, 0, 0],
          elbowR: [-76, 0, 0],
          kneeL: [18, 0, 0],
          kneeR: [18, 0, 0],
          ankleL: [18, 0, 0],
          ankleR: [18, 0, 0],
        },
        liftY: 0,
        contraction: 0.55,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          hips: [4, 0, 0],
          shoulderL: [-14, 0, 28],
          shoulderR: [-14, 0, -28],
          elbowL: [-78, 0, 0],
          elbowR: [-78, 0, 0],
          kneeL: [8, 0, 0],
          kneeR: [8, 0, 0],
          ankleL: [34, 0, 0],
          ankleR: [34, 0, 0],
        },
        liftY: 0.14,
        contraction: 0.95,
        concentric: true,
      },
    ],
  },

  soccer_strike: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [8, -14, 0],
          chest: [0, 12, 0],
          shoulderL: [-28, 0, 32],
          shoulderR: [24, 0, -18],
          elbowL: [-34, 0, 0],
          elbowR: [-52, 0, 0],
          hipL: [-16, 0, 8],
          hipR: [34, 0, -6],
          kneeL: [24, 0, 0],
          kneeR: [76, 0, 0],
        },
        contraction: 0.4,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          hips: [-8, 22, 6],
          chest: [12, -16, 0],
          shoulderL: [28, 0, 38],
          shoulderR: [-62, 0, -24],
          elbowL: [-32, 0, 0],
          elbowR: [-46, 0, 0],
          hipL: [-14, 0, 8],
          hipR: [-68, 0, 12],
          kneeL: [18, 0, 0],
          kneeR: [12, 0, 0],
          ankleR: [28, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  racket_forehand: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [16, -28, 0],
          chest: [6, -24, 0],
          neck: [0, 36, 0],
          shoulderL: [-48, -18, 12],
          shoulderR: [22, 0, -48],
          elbowL: [-62, 0, 0],
          elbowR: [-52, 0, 0],
          hipL: [-24, 0, 12],
          hipR: [-18, 0, -12],
          kneeL: [34, 0, 0],
          kneeR: [30, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [14, 24, 0],
          chest: [6, 32, 0],
          neck: [0, -32, 0],
          shoulderL: [12, 0, 26],
          shoulderR: [-84, 34, 24],
          elbowL: [-72, 0, 0],
          elbowR: [-76, 0, 0],
          hipL: [-22, 0, 12],
          hipR: [-18, 0, -12],
          kneeL: [26, 0, 0],
          kneeR: [32, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  basketball_jumpshot: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [14, 0, 0],
          shoulderL: [-62, -16, 12],
          shoulderR: [-62, 16, -12],
          elbowL: [-92, 0, 0],
          elbowR: [-92, 0, 0],
          hipL: [-54, 0, 6],
          hipR: [-54, 0, -6],
          kneeL: [62, 0, 0],
          kneeR: [62, 0, 0],
        },
        liftY: 0,
        contraction: 0.4,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [-4, 0, 0],
          neck: [-14, 0, 0],
          shoulderL: [-138, 0, 12],
          shoulderR: [-156, 0, -8],
          elbowL: [-24, 0, 0],
          elbowR: [-12, 0, 0],
          hipL: [0, 0, 4],
          hipR: [0, 0, -4],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
          ankleL: [28, 0, 0],
          ankleR: [28, 0, 0],
        },
        liftY: 0.24,
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  heavy_bag_boxing: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [10, -24, 0],
          chest: [6, 8, 0],
          shoulderL: [-54, -10, 14],
          shoulderR: [-52, 10, -14],
          elbowL: [-108, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-28, 0, 6],
          hipR: [18, 0, -6],
          kneeL: [30, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.28,
        joints: {
          hips: [12, -10, 0],
          chest: [8, -22, 0],
          shoulderL: [-92, 0, 6],
          shoulderR: [-52, 12, -14],
          elbowL: [-8, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-30, 0, 6],
          hipR: [20, 0, -6],
          kneeL: [30, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.95,
        concentric: true,
      },
      {
        t: 0.55,
        joints: {
          hips: [10, -24, 0],
          chest: [6, 8, 0],
          shoulderL: [-54, -10, 14],
          shoulderR: [-52, 10, -14],
          elbowL: [-108, 0, 0],
          elbowR: [-112, 0, 0],
          hipL: [-28, 0, 6],
          hipR: [18, 0, -6],
          kneeL: [30, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.8,
        joints: {
          hips: [12, 24, 0],
          chest: [8, 28, 0],
          shoulderL: [-52, -12, 14],
          shoulderR: [-94, 0, -6],
          elbowL: [-110, 0, 0],
          elbowR: [-8, 0, 0],
          hipL: [-24, 0, 6],
          hipR: [14, 0, -6],
          kneeL: [26, 0, 0],
          kneeR: [22, 0, 0],
        },
        contraction: 0.99,
        concentric: true,
      },
    ],
  },

  martial_arts_guard_kick: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [8, -26, 0],
          chest: [4, 18, 0],
          shoulderL: [-56, -10, 18],
          shoulderR: [-56, 10, -18],
          elbowL: [-102, 0, 0],
          elbowR: [-102, 0, 0],
          hipL: [-26, 0, 10],
          hipR: [16, 0, -10],
          kneeL: [28, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.35,
        concentric: false,
      },
      {
        t: 0.45,
        joints: {
          hips: [-14, 18, 0],
          chest: [8, -12, 0],
          shoulderL: [-54, -8, 18],
          shoulderR: [-52, 8, -22],
          elbowL: [-104, 0, 0],
          elbowR: [-104, 0, 0],
          hipL: [-10, 0, 8],
          hipR: [-92, 0, -10],
          kneeL: [14, 0, 0],
          kneeR: [12, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  kettlebell_thruster_wod: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [22, 0, 0],
          spine: [8, 0, 0],
          shoulderL: [-48, -16, 12],
          shoulderR: [-48, 16, -12],
          elbowL: [-108, 0, 0],
          elbowR: [-108, 0, 0],
          hipL: [-106, 0, 12],
          hipR: [-106, 0, -12],
          kneeL: [104, 0, 0],
          kneeR: [104, 0, 0],
          ankleL: [-18, 0, 0],
          ankleR: [-18, 0, 0],
        },
        contraction: 0.4,
        concentric: false,
      },
      {
        t: 0.48,
        joints: {
          hips: [-2, 0, 0],
          shoulderL: [-168, 0, 10],
          shoulderR: [-168, 0, -10],
          elbowL: [-10, 0, 0],
          elbowR: [-10, 0, 0],
          hipL: [-2, 0, 6],
          hipR: [-2, 0, -6],
          kneeL: [6, 0, 0],
          kneeR: [6, 0, 0],
        },
        contraction: 0.98,
        concentric: true,
      },
    ],
  },

  bouldering_climb: {
    groundMode: "standing",
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [8, 0, 0],
          neck: [-18, 0, 0],
          shoulderL: [-156, 0, 22],
          shoulderR: [-86, 0, -26],
          elbowL: [-28, 0, 0],
          elbowR: [-88, 0, 0],
          hipL: [-76, 0, 18],
          hipR: [-22, 0, -14],
          kneeL: [84, 0, 0],
          kneeR: [28, 0, 0],
        },
        liftY: 0.08,
        contraction: 0.85,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [8, 0, 0],
          neck: [-18, 0, 0],
          shoulderL: [-86, 0, 26],
          shoulderR: [-156, 0, -22],
          elbowL: [-88, 0, 0],
          elbowR: [-28, 0, 0],
          hipL: [-22, 0, 14],
          hipR: [-76, 0, -18],
          kneeL: [28, 0, 0],
          kneeR: [84, 0, 0],
        },
        liftY: 0.16,
        contraction: 0.94,
        concentric: true,
      },
    ],
  },

  trail_hiking_incline: {
    groundMode: "standing",
    linearInterpolation: true,
    keyframes: [
      {
        t: 0,
        joints: {
          hips: [16, 4, 0],
          spine: [6, 0, 0],
          shoulderL: [14, 0, 10],
          shoulderR: [-58, 0, -10],
          elbowL: [-68, 0, 0],
          elbowR: [-52, 0, 0],
          hipL: [-48, 0, 3],
          hipR: [24, 0, -3],
          kneeL: [44, 0, 0],
          kneeR: [24, 0, 0],
        },
        contraction: 0.72,
        concentric: true,
      },
      {
        t: 0.5,
        joints: {
          hips: [16, -4, 0],
          spine: [6, 0, 0],
          shoulderL: [-58, 0, 10],
          shoulderR: [14, 0, -10],
          elbowL: [-52, 0, 0],
          elbowR: [-68, 0, 0],
          hipL: [24, 0, 3],
          hipR: [-48, 0, -3],
          kneeL: [24, 0, 0],
          kneeR: [44, 0, 0],
        },
        contraction: 0.72,
        concentric: true,
      },
    ],
  },
};

export function evaluateMovementPose(
  archetype: MovementArchetypeId,
  rawPhase01: number
): EvaluatedPose {
  const def = MOVEMENT_ARCHETYPES[archetype] ?? MOVEMENT_ARCHETYPES.bodyweight_squat;
  const frames = def.keyframes;
  const n = frames.length;
  const phase01 = ((rawPhase01 % 1) + 1) % 1;

  if (n === 1) {
    const f = frames[0];
    return {
      joints: mergeJoints(f.joints),
      hipsPosOffset: f.hipsPos ?? [0, 0, 0],
      liftY: f.liftY ?? 0,
      contraction01: f.contraction ?? 0.5,
      isConcentric: f.concentric ?? true,
      groundMode: def.groundMode,
      phase01,
    };
  }

  let i0 = 0;
  for (let i = 0; i < n; i++) {
    if (frames[i].t <= phase01) {
      i0 = i;
    }
  }
  const i1 = (i0 + 1) % n;
  const f0 = frames[i0];
  const f1 = frames[i1];

  const span = i1 === 0 ? 1 - f0.t + f1.t : Math.max(0.0001, f1.t - f0.t);
  const localT = Math.max(0, Math.min(1, (phase01 - f0.t) / span));
  const smoothT = def.linearInterpolation
    ? localT
    : 0.5 - 0.5 * Math.cos(localT * Math.PI);

  const j0 = mergeJoints(f0.joints);
  const j1 = mergeJoints(f1.joints);

  // Micro-respiration organique subtile pour garder le personnage vivant même en isométrie
  const breathPulse = Math.sin(phase01 * Math.PI * 2) * 1.4;

  const joints: JointPoseMap = {
    hips: lerpVec3(j0.hips, j1.hips, smoothT),
    spine: lerpVec3(j0.spine, j1.spine, smoothT),
    chest: [
      lerpNum(j0.chest[0], j1.chest[0], smoothT) + breathPulse,
      lerpNum(j0.chest[1], j1.chest[1], smoothT),
      lerpNum(j0.chest[2], j1.chest[2], smoothT),
    ],
    neck: lerpVec3(j0.neck, j1.neck, smoothT),
    shoulderL: lerpVec3(j0.shoulderL, j1.shoulderL, smoothT),
    shoulderR: lerpVec3(j0.shoulderR, j1.shoulderR, smoothT),
    elbowL: lerpVec3(j0.elbowL, j1.elbowL, smoothT),
    elbowR: lerpVec3(j0.elbowR, j1.elbowR, smoothT),
    hipL: lerpVec3(j0.hipL, j1.hipL, smoothT),
    hipR: lerpVec3(j0.hipR, j1.hipR, smoothT),
    kneeL: lerpVec3(j0.kneeL, j1.kneeL, smoothT),
    kneeR: lerpVec3(j0.kneeR, j1.kneeR, smoothT),
    ankleL: lerpVec3(j0.ankleL, j1.ankleL, smoothT),
    ankleR: lerpVec3(j0.ankleR, j1.ankleR, smoothT),
  };

  const p0 = f0.hipsPos ?? [0, 0, 0];
  const p1 = f1.hipsPos ?? [0, 0, 0];
  const hipsPosOffset: [number, number, number] = [
    lerpNum(p0[0], p1[0], smoothT),
    lerpNum(p0[1], p1[1], smoothT),
    lerpNum(p0[2], p1[2], smoothT),
  ];

  const liftY = lerpNum(f0.liftY ?? 0, f1.liftY ?? 0, smoothT);
  const contraction01 = Math.max(
    0,
    Math.min(1, lerpNum(f0.contraction ?? 0.5, f1.contraction ?? 0.5, smoothT))
  );
  const isConcentric = f0.concentric ?? true;

  return {
    joints,
    hipsPosOffset,
    liftY,
    contraction01,
    isConcentric,
    groundMode: def.groundMode,
    phase01,
  };
}

export const EXERCISE_VISUAL_SPECS: Record<string, ExerciseVisualSpec> = {
  "sos-breathing-mobility": {
    exerciseId: "sos-breathing-mobility",
    movements: [
      {
        id: "sos-shoulder-rolls",
        labelFr: "Cercles d'épaules & respiration",
        archetype: "shoulder_rolls_breath",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 4.0,
        primaryMuscles: ["neck_traps", "shoulders"],
        secondaryMuscles: ["upper_back", "chest"],
        breathingCue: {
          eccentric: "Relâchez les épaules loin des oreilles",
          concentric: "Inspirez en ouvrant la cage thoracique",
        },
        postureTips: [
          "Épaules basses en fin de cercle, nuque longue.",
          "Respirez lentement : 4 s inspiration, 6 s expiration.",
        ],
        freeExerciseDbId: "Arm_Circles",
        deskBreakMitId: "shoulder-shrugs",
      },
      {
        id: "sos-soft-squats",
        labelFr: "Flexions douces des genoux",
        archetype: "bodyweight_squat",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.4,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["calves", "abs_core"],
        breathingCue: {
          eccentric: "Inspirez en fléchissant doucement à mi-hauteur",
          concentric: "Expirez en remontant sans à-coups",
        },
        postureTips: [
          "Inutile de descendre bas : restez confortable.",
          "Gardez le poids réparti sur tout le pied.",
        ],
        freeExerciseDbId: "Bodyweight_Squat",
      },
    ],
  },

  "sos-wall-pushups-sitstand": {
    exerciseId: "sos-wall-pushups-sitstand",
    movements: [
      {
        id: "sos-wall-push",
        labelFr: "Pompes inclinées contre mur",
        archetype: "wall_pushup",
        prop: "wall",
        defaultCamera: "side_profile",
        cycleSeconds: 2.8,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders", "abs_core"],
        breathingCue: {
          eccentric: "Inspirez en approchant la poitrine du mur",
          concentric: "Expirez en repoussant avec les paumes",
        },
        postureTips: [
          "Corps gainé bien droit des chevilles aux épaules.",
          "Coudes à ~45° vers le bas, pas écartés à 90°.",
        ],
        freeExerciseDbId: "Incline_Push-Up",
      },
      {
        id: "sos-chair-sitstand",
        labelFr: "Levers de chaise contrôlés",
        archetype: "chair_sit_to_stand",
        prop: "chair",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core", "calves"],
        breathingCue: {
          eccentric: "Inspirez en freinant l'assise (2 secondes)",
          concentric: "Expirez en poussant fort dans les talons",
        },
        postureTips: [
          "Effleurez simplement l'assise sans vous laisser tomber.",
          "Genoux alignés avec les pointes de pieds.",
        ],
        freeExerciseDbId: "Bodyweight_Squat",
        deskBreakMitId: "chair-sit-stand",
      },
    ],
  },

  "vilpa-stairs-burst": {
    exerciseId: "vilpa-stairs-burst",
    movements: [
      {
        id: "vilpa-stairs",
        labelFr: "Montée d'escaliers tonique",
        archetype: "stair_climb_burst",
        prop: "stairs",
        defaultCamera: "side_profile",
        cycleSeconds: 1.3,
        primaryMuscles: ["glutes", "quads", "cardio_heart"],
        secondaryMuscles: ["calves", "hamstrings"],
        breathingCue: {
          eccentric: "Posez le pied complet sur la marche",
          concentric: "Poussez dans la fesse et soufflez régulièrement",
        },
        postureTips: [
          "Dos grand et regard devant vous, pas sur vos pieds.",
          "Gardez une cadence vive mais maîtrisée à la descente.",
        ],
        freeExerciseDbId: "Stairmaster",
      },
    ],
  },

  "vilpa-fast-marching": {
    exerciseId: "vilpa-fast-marching",
    movements: [
      {
        id: "vilpa-high-knees",
        labelFr: "Marche rapide genoux hauts",
        archetype: "high_knee_march",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.2,
        primaryMuscles: ["hip_flexors", "cardio_heart"],
        secondaryMuscles: ["abs_core", "quads", "calves"],
        breathingCue: {
          eccentric: "Posez le pied silencieusement sans sauter",
          concentric: "Expirez court à chaque montée de genou",
        },
        postureTips: [
          "Rentrez légèrement le nombril sans courber le dos.",
          "Balancez les bras pliés à 90° pour accélérer le cardio.",
        ],
        deskBreakMitId: "high-knee-march",
      },
    ],
  },

  "vilpa-shadow-boxing": {
    exerciseId: "vilpa-shadow-boxing",
    movements: [
      {
        id: "vilpa-shadow",
        labelFr: "Shadow boxing jabs & directs",
        archetype: "shadow_boxing",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.8,
        primaryMuscles: ["shoulders", "cardio_heart"],
        secondaryMuscles: ["obliques", "triceps", "upper_back"],
        breathingCue: {
          eccentric: "Ramenez vite le poing en garde au menton",
          concentric: "Soufflez sec (« shh ! ») à chaque frappe",
        },
        postureTips: [
          "Pivotez la hanche et le pied arrière sur le direct.",
          "Ne verrouillez jamais complètement le coude en bout de course.",
        ],
      },
    ],
  },

  "digestive-walk-10": {
    exerciseId: "digestive-walk-10",
    movements: [
      {
        id: "walk-digestive",
        labelFr: "Marche digestive post-repas",
        archetype: "brisk_walk",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 1.5,
        primaryMuscles: ["quads", "calves", "cardio_heart"],
        secondaryMuscles: ["glutes", "abs_core"],
        breathingCue: {
          eccentric: "Déroulez du talon jusqu'aux orteils",
          concentric: "Respirez calmement par le nez",
        },
        postureTips: [
          "Allure aisée : votre estomac reste 100 % confortable.",
          "10 minutes suffisent à lisser la glycémie après manger.",
        ],
        deskBreakMitId: "march-in-place",
      },
    ],
  },

  "brisk-walk-20": {
    exerciseId: "brisk-walk-20",
    movements: [
      {
        id: "walk-brisk-20",
        labelFr: "Marche active bras dynamiques",
        archetype: "brisk_walk",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.25,
        primaryMuscles: ["glutes", "calves", "cardio_heart"],
        secondaryMuscles: ["hamstrings", "quads"],
        breathingCue: {
          eccentric: "Foulée fluide et régulière",
          concentric: "Parlez en phrases courtes sans vous essouffler",
        },
        postureTips: [
          "Bras pliés à ~80° pour entraîner une cadence active.",
          "Épaules détendues, poitrine ouverte.",
        ],
        deskBreakMitId: "march-in-place",
      },
    ],
  },

  "brisk-walk-35": {
    exerciseId: "brisk-walk-35",
    movements: [
      {
        id: "walk-zone2-35",
        labelFr: "Grande marche endurance Zone 2",
        archetype: "brisk_walk",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 1.15,
        primaryMuscles: ["cardio_heart", "glutes", "hamstrings"],
        secondaryMuscles: ["calves", "quads"],
        breathingCue: {
          eccentric: "Cadence soutenue ~5,8 km/h",
          concentric: "Souffle régulier en endurance aérobie",
        },
        postureTips: [
          "Poussez activement avec l'arrière du pied à chaque pas.",
          "5 min douces au début et à la fin.",
        ],
        deskBreakMitId: "march-in-place",
      },
    ],
  },

  "nojump-cardio-10": {
    exerciseId: "nojump-cardio-10",
    movements: [
      {
        id: "nojump-step-jack",
        labelFr: "Step-touch bras au-dessus",
        archetype: "step_jack_no_jump",
        prop: "none",
        defaultCamera: "front",
        cycleSeconds: 2.0,
        primaryMuscles: ["shoulders", "cardio_heart"],
        secondaryMuscles: ["glutes", "obliques"],
        breathingCue: {
          eccentric: "Ramenez bras et jambe sans choc",
          concentric: "Expirez en ouvrant largement vers le haut",
        },
        postureTips: [
          "Zéro impact : un pied reste toujours en contact avec le sol.",
          "Montez les bras dans le plan de l'épaule sans cambrer.",
        ],
        deskBreakMitId: "step-jack",
      },
      {
        id: "nojump-squat-partial",
        labelFr: "Squats partiels dynamiques",
        archetype: "bodyweight_squat",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.4,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core"],
        breathingCue: {
          eccentric: "Inspirez en envoyant les hanches derrière",
          concentric: "Expirez en remontant droit",
        },
        postureTips: [
          "Descendez selon la zone sans gêne pour vos genoux.",
          "Talons bien ancrés au sol.",
        ],
        freeExerciseDbId: "Bodyweight_Squat",
      },
      {
        id: "nojump-high-march",
        labelFr: "Marche rapide sans impact",
        archetype: "high_knee_march",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.3,
        primaryMuscles: ["cardio_heart", "hip_flexors"],
        secondaryMuscles: ["calves", "abs_core"],
        breathingCue: {
          eccentric: "Réception souple sur l'avant du pied",
          concentric: "Rythme vif bras actifs",
        },
        postureTips: ["Parfait en appartement, aucun bruit ni saut."],
        deskBreakMitId: "high-knee-march",
      },
    ],
  },

  "nojump-hiit-12": {
    exerciseId: "nojump-hiit-12",
    movements: [
      {
        id: "hiit-squat",
        labelFr: "1. Squat poids du corps",
        archetype: "bodyweight_squat",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.3,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core"],
        breathingCue: {
          eccentric: "Inspirez à la descente",
          concentric: "Expirez fort en poussant",
        },
        postureTips: ["Dos neutre, poitrine ouverte."],
        freeExerciseDbId: "Bodyweight_Squat",
      },
      {
        id: "hiit-plank",
        labelFr: "2. Planche stable",
        archetype: "plank_hold_breathing",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["abs_core", "shoulders"],
        secondaryMuscles: ["glutes", "lower_back"],
        breathingCue: {
          eccentric: "Inspirez en gardant le ventre rentré",
          concentric: "Expirez en serrant abdos et fessiers",
        },
        postureTips: ["Ne laissez pas les hanches tomber vers le sol."],
        freeExerciseDbId: "Plank",
      },
      {
        id: "hiit-climbers",
        labelFr: "3. Mountain climbers lents",
        archetype: "mountain_climber_low",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 1.8,
        primaryMuscles: ["abs_core", "hip_flexors", "cardio_heart"],
        secondaryMuscles: ["shoulders", "quads"],
        breathingCue: {
          eccentric: "Reposez le pied loin derrière",
          concentric: "Expirez en ramenant le genou vers la poitrine",
        },
        postureTips: ["Épaules stables au-dessus des poignets."],
        freeExerciseDbId: "Mountain_Climbers",
      },
      {
        id: "hiit-stepjack",
        labelFr: "4. Jumping jacks sans saut",
        archetype: "step_jack_no_jump",
        prop: "none",
        defaultCamera: "front",
        cycleSeconds: 1.8,
        primaryMuscles: ["cardio_heart", "shoulders"],
        secondaryMuscles: ["glutes"],
        breathingCue: {
          eccentric: "Revenez au centre en contrôle",
          concentric: "Ouvrez largement bras et pas latéral",
        },
        postureTips: ["Gardez le buste grand pendant les 30 secondes."],
        deskBreakMitId: "step-jack",
      },
    ],
  },

  "housework-power-20": {
    exerciseId: "housework-power-20",
    movements: [
      {
        id: "neat-active-walk",
        labelFr: "Déplacements & gestes actifs NEAT",
        archetype: "brisk_walk",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.4,
        primaryMuscles: ["calves", "quads", "cardio_heart"],
        secondaryMuscles: ["lower_back", "shoulders"],
        breathingCue: {
          eccentric: "Fléchissez les genoux plutôt que le dos pour ramasser",
          concentric: "Bougez sans pause sur votre playlist",
        },
        postureTips: ["Gainez légèrement lors des rotations avec aspirateur ou charges."],
      },
    ],
  },

  "strength-lower-glutes": {
    exerciseId: "strength-lower-glutes",
    movements: [
      {
        id: "lower-squat-tempo",
        labelFr: "1. Squats contrôlés (3 s)",
        archetype: "bodyweight_squat",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.6,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core", "hamstrings"],
        breathingCue: {
          eccentric: "Descendez sur 3 secondes en inspirant",
          concentric: "Remontez explosif en expirant",
        },
        postureTips: [
          "Genoux dans l'axe du 2e orteil.",
          "Protège la masse maigre même en déficit calorique.",
        ],
        freeExerciseDbId: "Bodyweight_Squat",
      },
      {
        id: "lower-reverse-lunge",
        labelFr: "2. Fentes arrière alternées",
        archetype: "reverse_lunge",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.4,
        primaryMuscles: ["glutes", "quads"],
        secondaryMuscles: ["hamstrings", "calves"],
        breathingCue: {
          eccentric: "Reculez un grand pas et descendez verticalement",
          concentric: "Poussez dans le talon avant pour revenir",
        },
        postureTips: [
          "La fente arrière soulage la rotule par rapport à la fente avant.",
          "Buste droit, appui chaise possible au début.",
        ],
        freeExerciseDbId: "Crossover_Reverse_Lunge",
      },
      {
        id: "lower-glute-bridge",
        labelFr: "3. Ponts fessiers au sol (pause 2 s)",
        archetype: "glute_bridge",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["glutes", "hamstrings"],
        secondaryMuscles: ["lower_back", "abs_core"],
        breathingCue: {
          eccentric: "Redescendez vertèbre par vertèbre en inspirant",
          concentric: "Serrez fort les fessiers en haut 2 secondes",
        },
        postureTips: [
          "Poussez dans les talons, pas dans le bas du dos.",
          "Alignez épaules-hanches-genoux en haut du geste.",
        ],
        freeExerciseDbId: "Butt_Lift_Bridge",
        deskBreakMitId: "glute-bridge",
      },
    ],
  },

  "strength-upper-posture": {
    exerciseId: "strength-upper-posture",
    movements: [
      {
        id: "upper-wall-pushup",
        labelFr: "1. Pompes inclinées maîtrisées",
        archetype: "wall_pushup",
        prop: "wall",
        defaultCamera: "side_profile",
        cycleSeconds: 2.8,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders", "abs_core"],
        breathingCue: {
          eccentric: "Inspirez en contrôlant la descente",
          concentric: "Expirez en repoussant fermement",
        },
        postureTips: ["Omoplates stables, abdos engagés."],
        freeExerciseDbId: "Incline_Push-Up",
      },
      {
        id: "upper-ytw-back",
        labelFr: "2. Y-T-W haut du dos penché",
        archetype: "bent_over_ytw_row",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["upper_back", "shoulders"],
        secondaryMuscles: ["lower_back", "neck_traps"],
        breathingCue: {
          eccentric: "Relâchez les bras sous la poitrine en inspirant",
          concentric: "Serrez les omoplates vers la colonne en expirant",
        },
        postureTips: [
          "Buste penché à ~40°, dos plat et genoux souples.",
          "Pouces tournés vers le plafond en montant les bras.",
        ],
        freeExerciseDbId: "Superman",
      },
      {
        id: "upper-plank",
        labelFr: "3. Gainage postural",
        archetype: "plank_hold_breathing",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["abs_core", "shoulders"],
        secondaryMuscles: ["upper_back", "glutes"],
        breathingCue: {
          eccentric: "Inspirez calmement par le nez",
          concentric: "Repoussez le sol avec les épaules",
        },
        postureTips: ["Tête alignée dans le prolongement du dos."],
        freeExerciseDbId: "Plank",
      },
    ],
  },

  "strength-core-protect": {
    exerciseId: "strength-core-protect",
    movements: [
      {
        id: "core-deadbug",
        labelFr: "1. Dead Bug dos plaqué au sol",
        archetype: "dead_bug_core",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.8,
        primaryMuscles: ["abs_core"],
        secondaryMuscles: ["hip_flexors", "obliques"],
        breathingCue: {
          eccentric: "Ramenez bras et jambe opposés à la verticale",
          concentric: "Expirez lentement en allongeant sans décoller les lombaires",
        },
        postureTips: [
          "Le bas du dos reste collé au tapis du début à la fin.",
          "Zéro tension dans la nuque.",
        ],
        freeExerciseDbId: "Dead_Bug",
        deskBreakMitId: "dead-bug",
      },
      {
        id: "core-birddog",
        labelFr: "2. Bird-Dog à quatre pattes",
        archetype: "bird_dog_quadruped",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.8,
        primaryMuscles: ["lower_back", "abs_core", "glutes"],
        secondaryMuscles: ["shoulders", "upper_back"],
        breathingCue: {
          eccentric: "Revenez en équilibre sans basculer le bassin",
          concentric: "Allongez bras et jambe opposés horizontalement",
        },
        postureTips: [
          "Cherchez la longueur plutôt que de monter la jambe trop haut.",
          "Regard dirigé vers le tapis.",
        ],
        freeExerciseDbId: "Superman",
      },
      {
        id: "core-sideplank",
        labelFr: "3. Planche latérale protectrice",
        archetype: "side_plank_hold",
        prop: "yoga_mat",
        defaultCamera: "front",
        cycleSeconds: 3.6,
        primaryMuscles: ["obliques", "abs_core"],
        secondaryMuscles: ["shoulders", "glutes"],
        breathingCue: {
          eccentric: "Maintenez les hanches hautes",
          concentric: "Expirez en aspirant la taille vers le plafond",
        },
        postureTips: ["Coude sous l'épaule, option genoux fléchis si besoin."],
        freeExerciseDbId: "Plank",
      },
    ],
  },

  "strength-fullbody-15": {
    exerciseId: "strength-fullbody-15",
    movements: [
      {
        id: "fb-squats",
        labelFr: "1. Squats chaise",
        archetype: "chair_sit_to_stand",
        prop: "chair",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.8,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core"],
        breathingCue: {
          eccentric: "Inspirez en contrôlant vers la chaise",
          concentric: "Expirez en remontant tonique",
        },
        postureTips: ["Gardez le buste fier."],
        freeExerciseDbId: "Bodyweight_Squat",
      },
      {
        id: "fb-pushups",
        labelFr: "2. Pompes inclinées",
        archetype: "wall_pushup",
        prop: "wall",
        defaultCamera: "side_profile",
        cycleSeconds: 2.6,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders"],
        breathingCue: {
          eccentric: "Inspirez en descendant la poitrine",
          concentric: "Expirez en repoussant",
        },
        postureTips: ["Alignement épaules-bassin-chevilles."],
        freeExerciseDbId: "Incline_Push-Up",
      },
      {
        id: "fb-row",
        labelFr: "3. Rowing dos penché",
        archetype: "dumbbell_row",
        prop: "dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.8,
        primaryMuscles: ["upper_back", "lats"],
        secondaryMuscles: ["biceps", "lower_back"],
        breathingCue: {
          eccentric: "Tendez les bras en inspirant",
          concentric: "Tirez les coudes près des hanches en expirant",
        },
        postureTips: ["Dos droit verrouillé, épaules loin des oreilles."],
        freeExerciseDbId: "One-Arm_Dumbbell_Row",
      },
      {
        id: "fb-plank",
        labelFr: "4. Gainage respiratoire",
        archetype: "plank_hold_breathing",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["abs_core", "shoulders"],
        secondaryMuscles: ["glutes"],
        breathingCue: {
          eccentric: "Inspirez profondément sans lâcher le dos",
          concentric: "Expirez en verrouillant le gainage",
        },
        postureTips: ["40 s travail / 20 s pause × 3 tours."],
        freeExerciseDbId: "Plank",
      },
    ],
  },

  "desk-neck-back-5": {
    exerciseId: "desk-neck-back-5",
    movements: [
      {
        id: "desk-twist",
        labelFr: "1. Rotations thoraciques assis",
        archetype: "seated_thoracic_twist",
        prop: "chair",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.6,
        primaryMuscles: ["obliques", "upper_back"],
        secondaryMuscles: ["neck_traps", "lower_back"],
        breathingCue: {
          eccentric: "Revenez face en inspirant et en grandissant la colonne",
          concentric: "Expirez doucement dans chaque rotation",
        },
        postureTips: [
          "Gardez les hanches fixes sur la chaise, seul le haut du buste tourne.",
          "Sans jamais forcer en bout de course.",
        ],
        deskBreakMitId: "t-arms-trunk-rotation",
      },
      {
        id: "desk-chest-open",
        labelFr: "2. Ouverture pectoraux encadrement",
        archetype: "chest_door_open_stretch",
        prop: "none",
        defaultCamera: "front",
        cycleSeconds: 4.0,
        primaryMuscles: ["chest", "shoulders"],
        secondaryMuscles: ["upper_back"],
        breathingCue: {
          eccentric: "Relâchez légèrement entre deux ouvertures",
          concentric: "Inspirez grand en ouvrant poitrine et épaules",
        },
        postureTips: ["Idéal après 1 h d'ordinateur pour libérer la respiration."],
        freeExerciseDbId: "Chest_And_Front_Of_Shoulder_Stretch",
      },
    ],
  },

  "desk-hips-hamstrings-8": {
    exerciseId: "desk-hips-hamstrings-8",
    movements: [
      {
        id: "hip-psoas-knight",
        labelFr: "1. Étirement du chevalier (psoas)",
        archetype: "kneeling_hip_flexor",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 4.0,
        primaryMuscles: ["hip_flexors", "quads"],
        secondaryMuscles: ["glutes", "abs_core"],
        breathingCue: {
          eccentric: "Reculez légèrement le bassin pour souffler",
          concentric: "Avancez doucement les hanches en serrant la fesse arrière",
        },
        postureTips: [
          "Rétroversez le bassin avant d'avancer pour cibler le psoas sans cambrer.",
        ],
      },
      {
        id: "hip-cat-cow",
        labelFr: "2. Chat-Vache respiratoire",
        archetype: "cat_cow_spine",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 4.0,
        primaryMuscles: ["lower_back", "upper_back"],
        secondaryMuscles: ["abs_core", "neck_traps"],
        breathingCue: {
          eccentric: "Creusez doucement en inspirant (Vache)",
          concentric: "Arrondissez toute la colonne en expirant (Chat)",
        },
        postureTips: ["Mouvement fluide guidé par la respiration."],
        freeExerciseDbId: "Cat_Stretch",
        deskBreakMitId: "cat-cow-standing",
      },
      {
        id: "hip-child-pose",
        labelFr: "3. Posture de l'enfant",
        archetype: "child_pose_breath",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 4.2,
        primaryMuscles: ["lower_back", "lats"],
        secondaryMuscles: ["shoulders", "glutes"],
        breathingCue: {
          eccentric: "Inspirez dans les côtes arrière",
          concentric: "Laissez le bassin fondre vers les talons",
        },
        postureTips: ["Détente complète des lombaires et des épaules."],
        freeExerciseDbId: "Childs_Pose",
      },
    ],
  },

  "yoga-morning-flow-10": {
    exerciseId: "yoga-morning-flow-10",
    movements: [
      {
        id: "yoga-salute",
        labelFr: "Salutation fluide & flexion douce",
        archetype: "yoga_sun_flow",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 4.4,
        primaryMuscles: ["hamstrings", "lower_back", "shoulders"],
        secondaryMuscles: ["abs_core", "calves"],
        breathingCue: {
          eccentric: "Expirez en descendant buste long genoux fléchis",
          concentric: "Inspirez grand bras vers le ciel",
        },
        postureTips: [
          "Gardez les genoux souples à la flexion avant pour protéger le dos.",
        ],
        deskBreakMitId: "upward-salute-gentle",
      },
    ],
  },

  "dance-energy-10": {
    exerciseId: "dance-energy-10",
    movements: [
      {
        id: "dance-groove",
        labelFr: "Cardio rythmé hanches & bras",
        archetype: "dance_cardio_groove",
        prop: "none",
        defaultCamera: "front",
        cycleSeconds: 1.5,
        primaryMuscles: ["cardio_heart", "glutes", "calves"],
        secondaryMuscles: ["obliques", "shoulders"],
        breathingCue: {
          eccentric: "Genoux souples pour absorber le rythme",
          concentric: "Engagez les bras et la taille sur le tempo",
        },
        postureTips: ["Bougez à votre propre tempo sur 3 morceaux dynamiques."],
        deskBreakMitId: "dance-groove",
      },
    ],
  },

  "cycling-outdoor-25": {
    exerciseId: "cycling-outdoor-25",
    movements: [
      {
        id: "cycle-moderate",
        labelFr: "Pédalage souple zéro impact",
        archetype: "cycling_cadence",
        prop: "bike",
        defaultCamera: "side_profile",
        cycleSeconds: 1.1,
        primaryMuscles: ["quads", "glutes", "cardio_heart"],
        secondaryMuscles: ["hamstrings", "calves"],
        breathingCue: {
          eccentric: "Tirez régulièrement en remontant la pédale",
          concentric: "Poussez fluide sans verrouiller le genou en bas",
        },
        postureTips: [
          "Épaules détendues sur le guidon, coudes légèrement fléchis.",
          "Réglez la selle pour garder ~25° de flexion en bas de course.",
        ],
        freeExerciseDbId: "Bicycling_Stationary",
      },
    ],
  },

  "jogging-light-20": {
    exerciseId: "jogging-light-20",
    movements: [
      {
        id: "jog-easy",
        labelFr: "Foulée trot progressif",
        archetype: "running_stride",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 1.0,
        primaryMuscles: ["cardio_heart", "quads", "calves"],
        secondaryMuscles: ["glutes", "hamstrings", "abs_core"],
        breathingCue: {
          eccentric: "Réception souple sous le centre de gravité",
          concentric: "Allure aisée capable de dire 4 à 5 mots",
        },
        postureTips: ["Petites foulées rapides plutôt que de grandes enjambées lourdes."],
        freeExerciseDbId: "Jogging_Treadmill",
      },
    ],
  },

  "swimming-25": {
    exerciseId: "swimming-25",
    movements: [
      {
        id: "swim-relaxed",
        labelFr: "Nage fluide en apesanteur",
        archetype: "swimming_crawl",
        prop: "pool_water",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.2,
        primaryMuscles: ["lats", "shoulders", "cardio_heart"],
        secondaryMuscles: ["abs_core", "triceps", "glutes"],
        breathingCue: {
          eccentric: "Soufflez doucement dans l'eau sous forme de bulles",
          concentric: "Inspirez court sur le côté sans lever la tête",
        },
        postureTips: [
          "Allongez le corps à l'horizontale en regardant le fond.",
          "Zéro charge articulaire sur genoux et hanches.",
        ],
      },
    ],
  },

  "calf-raises-balance-5": {
    exerciseId: "calf-raises-balance-5",
    movements: [
      {
        id: "calf-raises",
        labelFr: "Élévations mollets freinées 3 s",
        archetype: "calf_raise_balance",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["calves"],
        secondaryMuscles: ["quads", "abs_core"],
        breathingCue: {
          eccentric: "Freinez la descente des talons sur 3 secondes",
          concentric: "Montez haut sur les orteils en expirant",
        },
        postureTips: [
          "Pause d'1 seconde tout en haut à chaque répétition.",
          "Gardez un point fixe des yeux devant vous pour l'équilibre.",
        ],
        freeExerciseDbId: "Standing_Calf_Raises",
        deskBreakMitId: "calf-raises",
      },
    ],
  },

  "evening-cooldown-stretch-6": {
    exerciseId: "evening-cooldown-stretch-6",
    movements: [
      {
        id: "evening-supine-twist",
        labelFr: "Torsion douce allongée & détente",
        archetype: "supine_twist_stretch",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 4.5,
        primaryMuscles: ["lower_back", "obliques"],
        secondaryMuscles: ["glutes", "chest"],
        breathingCue: {
          eccentric: "Inspirez 5 secondes par le nez",
          concentric: "Expirez 5 secondes en relâchant les épaules au sol",
        },
        postureTips: ["Les deux épaules restent posées lourdement sur le tapis."],
        deskBreakMitId: "supine-twist",
      },
    ],
  },

  "gym-push-hypertrophy": {
    exerciseId: "gym-push-hypertrophy",
    movements: [
      {
        id: "push-bench",
        labelFr: "1. Développé couché haltères",
        archetype: "dumbbell_bench_press",
        prop: "bench_dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders"],
        breathingCue: {
          eccentric: "Inspirez en contrôlant les haltères près de la poitrine (2–3 s)",
          concentric: "Expirez en poussant vers le haut sans claquer les coudes",
        },
        postureTips: [
          "Omoplates serrées sur le banc, pieds ancrés au sol.",
          "Coudes à ~45° du buste pour protéger les épaules.",
        ],
        freeExerciseDbId: "Dumbbell_Bench_Press",
      },
      {
        id: "push-ohp",
        labelFr: "2. Développé militaire",
        archetype: "overhead_shoulder_press",
        prop: "dumbbells",
        defaultCamera: "front",
        cycleSeconds: 2.9,
        primaryMuscles: ["shoulders", "triceps"],
        secondaryMuscles: ["abs_core", "upper_back"],
        breathingCue: {
          eccentric: "Inspirez en ramenant les haltères à hauteur d'oreilles",
          concentric: "Gainez abdos/fessiers et pressez droit au-dessus",
        },
        postureTips: ["Évitez de cambrer les lombaires en haut du mouvement."],
        freeExerciseDbId: "Dumbbell_Shoulder_Press",
      },
      {
        id: "push-latraise",
        labelFr: "3. Élévations latérales",
        archetype: "lateral_raise",
        prop: "dumbbells",
        defaultCamera: "front",
        cycleSeconds: 2.7,
        primaryMuscles: ["shoulders"],
        secondaryMuscles: ["neck_traps", "forearms"],
        breathingCue: {
          eccentric: "Freinez la descente sans reposer l'élan",
          concentric: "Montez les coudes sur les côtés à hauteur d'épaule",
        },
        postureTips: ["Légère inclinaison du buste, ne montez pas les trapèzes."],
        freeExerciseDbId: "Side_Lateral_Raise",
      },
      {
        id: "push-triceps",
        labelFr: "4. Extensions triceps",
        archetype: "triceps_pushdown_ext",
        prop: "dumbbells",
        defaultCamera: "side_profile",
        cycleSeconds: 2.5,
        primaryMuscles: ["triceps"],
        secondaryMuscles: ["forearms", "abs_core"],
        breathingCue: {
          eccentric: "Remontez les avant-bras sans avancer les coudes",
          concentric: "Contractez fort les triceps en bas en expirant",
        },
        postureTips: ["Bras collés aux flancs : seul le coude pivote."],
        freeExerciseDbId: "Triceps_Pushdown",
      },
    ],
  },

  "gym-pull-hypertrophy": {
    exerciseId: "gym-pull-hypertrophy",
    movements: [
      {
        id: "pull-pullups",
        labelFr: "1. Tirage vertical / Tractions",
        archetype: "pullup_lat",
        prop: "pullup_bar",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["lats", "upper_back"],
        secondaryMuscles: ["biceps", "forearms"],
        breathingCue: {
          eccentric: "Étirez complètement le dos en bas en inspirant",
          concentric: "Tirez les coudes vers les hanches poitrine haute",
        },
        postureTips: [
          "Initiez le tirage en abaissant les épaules, pas avec la nuque.",
        ],
        freeExerciseDbId: "Pullups",
      },
      {
        id: "pull-db-row",
        labelFr: "2. Rowing haltères buste penché",
        archetype: "dumbbell_row",
        prop: "dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.8,
        primaryMuscles: ["upper_back", "lats"],
        secondaryMuscles: ["biceps", "lower_back", "forearms"],
        breathingCue: {
          eccentric: "Laissez les omoplates s'ouvrir en bas",
          concentric: "Tirez vers la hanche en serrant le dos 1 seconde",
        },
        postureTips: ["Colonne neutre, ne donnez pas d'élan lombaire."],
        freeExerciseDbId: "One-Arm_Dumbbell_Row",
      },
      {
        id: "pull-bicep-curl",
        labelFr: "3. Curl biceps contrôlé",
        archetype: "bicep_curl",
        prop: "dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.6,
        primaryMuscles: ["biceps"],
        secondaryMuscles: ["forearms", "shoulders"],
        breathingCue: {
          eccentric: "Freinez la descente 2–3 secondes",
          concentric: "Expirez en montant sans balancer le buste",
        },
        postureTips: ["Coudes fixes le long du corps."],
        freeExerciseDbId: "Dumbbell_Bicep_Curl",
      },
    ],
  },

  "gym-legs-glutes": {
    exerciseId: "gym-legs-glutes",
    movements: [
      {
        id: "legs-barbell-squat",
        labelFr: "1. Squat barre complet",
        archetype: "barbell_squat",
        prop: "barbell",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.4,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["lower_back", "abs_core", "hamstrings"],
        breathingCue: {
          eccentric: "Gros souffle dans le ventre (bracing) puis descendez contrôlé",
          concentric: "Poussez le sol loin de vous et expirez après le point dur",
        },
        postureTips: [
          "Genoux dans l'axe des pieds, poitrine haute.",
          "Amplitude propre sans décoller les talons.",
        ],
        freeExerciseDbId: "Barbell_Squat",
      },
      {
        id: "legs-rdl",
        labelFr: "2. Soulevé de terre roumain",
        archetype: "romanian_deadlift",
        prop: "barbell",
        defaultCamera: "side_profile",
        cycleSeconds: 3.4,
        primaryMuscles: ["hamstrings", "glutes"],
        secondaryMuscles: ["lower_back", "forearms", "upper_back"],
        breathingCue: {
          eccentric: "Reculez les fesses le long d'un mur imaginaire (genoux souples)",
          concentric: "Serrez les fessiers en avant pour revenir droit",
        },
        postureTips: [
          "La barre frôle vos cuisses et tibias : stop dès que les hanches ne reculent plus.",
        ],
        freeExerciseDbId: "Romanian_Deadlift",
      },
      {
        id: "legs-lunges",
        labelFr: "3. Fentes arrière / bulgares",
        archetype: "reverse_lunge",
        prop: "dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.2,
        primaryMuscles: ["glutes", "quads"],
        secondaryMuscles: ["hamstrings", "abs_core"],
        breathingCue: {
          eccentric: "Inspirez en descendant le genou arrière sous contrôle",
          concentric: "Expirez en poussant fort dans la jambe avant",
        },
        postureTips: ["Léger penchant du buste vers l'avant pour recruter davantage le fessier."],
        freeExerciseDbId: "Crossover_Reverse_Lunge",
      },
    ],
  },

  "gym-fullbody-mass": {
    exerciseId: "gym-fullbody-mass",
    movements: [
      {
        id: "mass-goblet",
        labelFr: "1. Goblet Squat profond",
        archetype: "bodyweight_squat",
        prop: "kettlebell",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.2,
        primaryMuscles: ["quads", "glutes"],
        secondaryMuscles: ["abs_core", "upper_back"],
        breathingCue: {
          eccentric: "Coudes à l'intérieur des genoux en bas",
          concentric: "Remontez vertical en serrant le haut du dos",
        },
        postureTips: ["Charge collée contre la poitrine."],
        freeExerciseDbId: "Goblet_Squat",
      },
      {
        id: "mass-press",
        labelFr: "2. Développé haltères",
        archetype: "dumbbell_bench_press",
        prop: "bench_dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.9,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders"],
        breathingCue: {
          eccentric: "Inspirez en bas, poitrine haute",
          concentric: "Expirez en poussant droit au-dessus",
        },
        postureTips: ["Contrôlez la trajectoire sur chaque rep."],
        freeExerciseDbId: "Dumbbell_Bench_Press",
      },
      {
        id: "mass-row",
        labelFr: "3. Rowing haltères / tirage",
        archetype: "dumbbell_row",
        prop: "dumbbells",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.8,
        primaryMuscles: ["lats", "upper_back"],
        secondaryMuscles: ["biceps", "lower_back"],
        breathingCue: {
          eccentric: "Tendez les bras en contrôle",
          concentric: "Tirez les omoplates ensemble",
        },
        postureTips: ["Gardez la nuque longue dans l'axe du dos."],
        freeExerciseDbId: "Seated_Cable_Rows",
      },
      {
        id: "mass-hipthrust",
        labelFr: "4. Hip Thrust / Pont fessier",
        archetype: "glute_bridge",
        prop: "yoga_mat",
        defaultCamera: "side_profile",
        cycleSeconds: 3.0,
        primaryMuscles: ["glutes", "hamstrings"],
        secondaryMuscles: ["abs_core"],
        breathingCue: {
          eccentric: "Inspirez en freinant la descente du bassin",
          concentric: "Pause 1 s contraction maximale en haut",
        },
        postureTips: ["Menton légèrement rentré, tibias verticaux en haut."],
        freeExerciseDbId: "Barbell_Glute_Bridge",
      },
    ],
  },

  "gym-calisthenics-street": {
    exerciseId: "gym-calisthenics-street",
    movements: [
      {
        id: "cal-pullups",
        labelFr: "1. Tractions pronation strictes",
        archetype: "pullup_lat",
        prop: "pullup_bar",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.9,
        primaryMuscles: ["lats", "upper_back"],
        secondaryMuscles: ["biceps", "forearms", "abs_core"],
        breathingCue: {
          eccentric: "Descente complète bras tendus sans rebond",
          concentric: "Montez le sternum vers la barre",
        },
        postureTips: ["Zéro balancier des jambes (strict form)."],
        freeExerciseDbId: "Pullups",
      },
      {
        id: "cal-dips",
        labelFr: "2. Dips barres parallèles",
        archetype: "parallel_bar_dips",
        prop: "dip_bars",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.9,
        primaryMuscles: ["chest", "triceps"],
        secondaryMuscles: ["shoulders", "abs_core"],
        breathingCue: {
          eccentric: "Descendez coudes à 90° sans enrouler les épaules devant",
          concentric: "Repoussez haut en abaissant les épaules",
        },
        postureTips: ["Penchez légèrement le buste pour recruter les pectoraux."],
        freeExerciseDbId: "Dips_-_Triceps_Version",
      },
      {
        id: "cal-core",
        labelFr: "3. Gainage L-Sit / Abdominaux",
        archetype: "dead_bug_core",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.4,
        primaryMuscles: ["abs_core", "hip_flexors"],
        secondaryMuscles: ["obliques"],
        breathingCue: {
          eccentric: "Contrôlez le retour sans cambrer",
          concentric: "Expirez en verrouillant le centre",
        },
        postureTips: ["Qualité de tension totale sur chaque seconde."],
        freeExerciseDbId: "Leg_Lift",
      },
    ],
  },

  "run-endurance-10kmh": {
    exerciseId: "run-endurance-10kmh",
    movements: [
      {
        id: "run-z2",
        labelFr: "Foulée endurance Zone 2 (~10 km/h)",
        archetype: "running_stride",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 0.9,
        primaryMuscles: ["cardio_heart", "quads", "glutes"],
        secondaryMuscles: ["hamstrings", "calves", "abs_core"],
        breathingCue: {
          eccentric: "Pied posé sous les hanches (~170 pas/min)",
          concentric: "Respiration fluide sur 3–4 foulées",
        },
        postureTips: [
          "Légère inclinaison avant depuis les chevilles, pas depuis la taille.",
          "80 % de vos sorties hebdo doivent rester dans cette zone confortable.",
        ],
        freeExerciseDbId: "Running_Treadmill",
      },
    ],
  },

  "run-vma-intervals": {
    exerciseId: "run-vma-intervals",
    movements: [
      {
        id: "run-vma",
        labelFr: "Fractionné VMA 30/30 haute cadence",
        archetype: "running_stride",
        prop: "none",
        defaultCamera: "side_profile",
        cycleSeconds: 0.68,
        primaryMuscles: ["cardio_heart", "hamstrings", "glutes"],
        secondaryMuscles: ["quads", "calves", "abs_core"],
        breathingCue: {
          eccentric: "Rebond dynamique rapide sur l'avant du pied",
          concentric: "Coudes tirés vigoureusement vers l'arrière",
        },
        postureTips: [
          "Genoux hauts et buste gainé sans tension aux trapèzes.",
          "Gardez le trot lent actif pendant les 30 s de récupération.",
        ],
        freeExerciseDbId: "Running_Treadmill",
      },
    ],
  },

  "trail-running-elevation": {
    exerciseId: "trail-running-elevation",
    movements: [
      {
        id: "trail-climb",
        labelFr: "Foulée trail & côte dénivelée",
        archetype: "trail_hiking_incline",
        prop: "backpack_poles",
        defaultCamera: "side_profile",
        cycleSeconds: 1.15,
        primaryMuscles: ["glutes", "quads", "calves"],
        secondaryMuscles: ["cardio_heart", "hamstrings", "abs_core"],
        breathingCue: {
          eccentric: "Foulée courte en descente technique",
          concentric: "Poussez fort dans les fessiers en montée",
        },
        postureTips: ["Pilotez l'effort au souffle (RPE) plutôt qu'à la vitesse/km."],
        freeExerciseDbId: "Running_Treadmill",
      },
    ],
  },

  "cycling-road-tempo": {
    exerciseId: "cycling-road-tempo",
    movements: [
      {
        id: "cycling-tempo",
        labelFr: "Cyclisme tempo 85–90 rpm",
        archetype: "cycling_cadence",
        prop: "bike",
        defaultCamera: "side_profile",
        cycleSeconds: 0.85,
        primaryMuscles: ["quads", "glutes", "cardio_heart"],
        secondaryMuscles: ["hamstrings", "calves", "lower_back"],
        breathingCue: {
          eccentric: "Coup de pédale rond sur 360°",
          concentric: "Cadence régulière 85–90 tours/min",
        },
        postureTips: ["Genoux parallèles au cadre, pas vers l'extérieur."],
        freeExerciseDbId: "Bicycling_Stationary",
      },
    ],
  },

  "swimming-laps-crawl": {
    exerciseId: "swimming-laps-crawl",
    movements: [
      {
        id: "swim-crawl-laps",
        labelFr: "Crawl sportif & roulis d'épaules",
        archetype: "swimming_crawl",
        prop: "pool_water",
        defaultCamera: "three_quarter",
        cycleSeconds: 1.75,
        primaryMuscles: ["lats", "shoulders", "cardio_heart"],
        secondaryMuscles: ["triceps", "abs_core", "obliques"],
        breathingCue: {
          eccentric: "Expiration continue sous l'eau",
          concentric: "Appui profond de l'avant-bras vers les pieds",
        },
        postureTips: [
          "Allongez loin devant avant d'accélérer la poussée sous le corps.",
        ],
      },
    ],
  },

  "rowing-ergometer": {
    exerciseId: "rowing-ergometer",
    movements: [
      {
        id: "rower-erg",
        labelFr: "Rameur : Jambes -> Buste -> Bras",
        archetype: "rowing_ergometer",
        prop: "rower",
        defaultCamera: "side_profile",
        cycleSeconds: 2.3,
        primaryMuscles: ["quads", "lats", "upper_back"],
        secondaryMuscles: ["glutes", "hamstrings", "biceps", "cardio_heart"],
        breathingCue: {
          eccentric: "Retour : Bras -> Buste -> Jambes (inspirez)",
          concentric: "Propulsion : poussez fort jambes d'abord puis tirez au sternum",
        },
        postureTips: [
          "Ratio 1 temps pour tirer / 2 temps pour revenir.",
          "85 % de la musculature sollicitée sans choc articulaire.",
        ],
        freeExerciseDbId: "Rowing_Stationary",
      },
    ],
  },

  "jump-rope-cardio": {
    exerciseId: "jump-rope-cardio",
    movements: [
      {
        id: "rope-boxer",
        labelFr: "Corde à sauter appuis légers",
        archetype: "jump_rope",
        prop: "jump_rope",
        defaultCamera: "three_quarter",
        cycleSeconds: 0.72,
        primaryMuscles: ["calves", "cardio_heart", "shoulders"],
        secondaryMuscles: ["forearms", "abs_core", "quads"],
        breathingCue: {
          eccentric: "Amorti souple sur l'avant-pied (2–3 cm du sol)",
          concentric: "Rotation venant uniquement des poignets",
        },
        postureTips: [
          "Coudes proches des flancs, ne sautez pas trop haut.",
          "Regard loin devant sur sol amortissant.",
        ],
        freeExerciseDbId: "Rope_Jumping",
      },
    ],
  },

  "football-match-five": {
    exerciseId: "football-match-five",
    movements: [
      {
        id: "soccer-kick",
        labelFr: "Appuis explosifs & frappe de balle",
        archetype: "soccer_strike",
        prop: "soccer_ball",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.1,
        primaryMuscles: ["quads", "hip_flexors", "cardio_heart"],
        secondaryMuscles: ["glutes", "hamstrings", "obliques", "calves"],
        breathingCue: {
          eccentric: "Pied d'appui solide orienté vers la cible",
          concentric: "Bras opposé équilibrant le fouetté de jambe",
        },
        postureTips: [
          "Échauffez toujours chevilles et adducteurs 10 min avant le Five.",
        ],
      },
    ],
  },

  "padel-tennis-match": {
    exerciseId: "padel-tennis-match",
    movements: [
      {
        id: "padel-forehand",
        labelFr: "Coup droit en rotation & reprise d'appuis",
        archetype: "racket_forehand",
        prop: "racket",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.2,
        primaryMuscles: ["shoulders", "obliques", "quads"],
        secondaryMuscles: ["chest", "forearms", "calves", "cardio_heart"],
        breathingCue: {
          eccentric: "Préparez tôt profil tourné, jambes fléchies",
          concentric: "Expirez à la frappe en transférant le poids vers l'avant",
        },
        postureTips: [
          "La puissance vient de la rotation hanches-tronc, pas seulement du bras.",
        ],
      },
    ],
  },

  "basketball-handball": {
    exerciseId: "basketball-handball",
    movements: [
      {
        id: "basket-shot",
        labelFr: "Détente verticale & tir en suspension",
        archetype: "basketball_jumpshot",
        prop: "basketball",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.3,
        primaryMuscles: ["quads", "calves", "shoulders"],
        secondaryMuscles: ["glutes", "triceps", "cardio_heart"],
        breathingCue: {
          eccentric: "Réception souple genoux alignés et hanches en arrière",
          concentric: "Poussée explosive cheville-genou-hanche vers le tir",
        },
        postureTips: ["Fouettez le poignet en haut de saut avec équilibre."],
      },
    ],
  },

  "boxing-bag-sparring": {
    exerciseId: "boxing-bag-sparring",
    movements: [
      {
        id: "boxing-bag-12",
        labelFr: "Enchaînement Jab-Cross au sac",
        archetype: "heavy_bag_boxing",
        prop: "punching_bag",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.0,
        primaryMuscles: ["shoulders", "obliques", "cardio_heart"],
        secondaryMuscles: ["triceps", "chest", "lats", "calves"],
        breathingCue: {
          eccentric: "Main libre toujours collée à la mâchoire",
          concentric: "Rotation hanche + épaule + expiration vive sur l'impact",
        },
        postureTips: ["Ne vous jetez pas vers l'avant : gardez votre axe central."],
      },
    ],
  },

  "martial-arts-judo-bjj": {
    exerciseId: "martial-arts-judo-bjj",
    movements: [
      {
        id: "bjj-guard-kick",
        labelFr: "Garde active, équilibre & coup de pied contrôlé",
        archetype: "martial_arts_guard_kick",
        prop: "yoga_mat",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.4,
        primaryMuscles: ["hip_flexors", "obliques", "glutes"],
        secondaryMuscles: ["quads", "abs_core", "cardio_heart"],
        breathingCue: {
          eccentric: "Ramenez le genou plié avant de reposer le pied",
          concentric: "Pivotez le pied d'appui pour libérer la hanche",
        },
        postureTips: ["Garde haute protectrice et gainage constant sur la jambe d'appui."],
      },
    ],
  },

  "crossfit-hyrox-wod": {
    exerciseId: "crossfit-hyrox-wod",
    movements: [
      {
        id: "wod-thruster",
        labelFr: "Thruster Kettlebell / Haltères",
        archetype: "kettlebell_thruster_wod",
        prop: "kettlebell",
        defaultCamera: "three_quarter",
        cycleSeconds: 2.6,
        primaryMuscles: ["quads", "shoulders", "glutes"],
        secondaryMuscles: ["triceps", "abs_core", "cardio_heart"],
        breathingCue: {
          eccentric: "Inspirez en squat, coudes hauts devant",
          concentric: "Utilisez l'élan des jambes pour propulser au-dessus",
        },
        postureTips: [
          "Gardez une technique propre même quand le cardio monte.",
        ],
        freeExerciseDbId: "Kettlebell_Thruster",
      },
    ],
  },

  "climbing-bouldering": {
    exerciseId: "climbing-bouldering",
    movements: [
      {
        id: "climb-wall",
        labelFr: "Poussée de jambes & traction sur mur",
        archetype: "bouldering_climb",
        prop: "climbing_wall",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["forearms", "lats", "upper_back"],
        secondaryMuscles: ["biceps", "abs_core", "calves"],
        breathingCue: {
          eccentric: "Gardez les bras tendus quand vous cherchez les pieds",
          concentric: "Poussez d'abord avec les pieds puis tirez avec le dos",
        },
        postureTips: ["Gardez le bassin proche du mur pour économiser vos avant-bras."],
      },
    ],
  },

  "hiking-mountain-pack": {
    exerciseId: "hiking-mountain-pack",
    movements: [
      {
        id: "hike-incline",
        labelFr: "Marche montagne avec bâtons & sac",
        archetype: "trail_hiking_incline",
        prop: "backpack_poles",
        defaultCamera: "side_profile",
        cycleSeconds: 1.5,
        primaryMuscles: ["glutes", "quads", "calves"],
        secondaryMuscles: ["hamstrings", "lower_back", "cardio_heart"],
        breathingCue: {
          eccentric: "Pas courts réguliers en montée raide",
          concentric: "Poussez dans les bâtons pour soulager 20 % des genoux",
        },
        postureTips: [
          "Hydratez-vous 400–600 mL/h et préservez vos appuis en descente.",
        ],
      },
    ],
  },
};

export function getExerciseVisualSpec(exercise: Pick<ExerciseDefinition, "id" | "title" | "category">): ExerciseVisualSpec {
  const found = EXERCISE_VISUAL_SPECS[exercise.id];
  if (found) return found;

  return {
    exerciseId: exercise.id,
    movements: [
      {
        id: `${exercise.id}-default`,
        labelFr: exercise.title,
        archetype:
          exercise.category === "desk_mobility"
            ? "shoulder_rolls_breath"
            : exercise.category === "digestive_walk"
              ? "brisk_walk"
              : "bodyweight_squat",
        prop: "none",
        defaultCamera: "three_quarter",
        cycleSeconds: 3.0,
        primaryMuscles: ["quads", "glutes", "cardio_heart"],
        secondaryMuscles: ["abs_core"],
        breathingCue: {
          eccentric: "Inspirez en préparant le mouvement",
          concentric: "Expirez dans l'effort contrôlé",
        },
        postureTips: ["Mouvement fluide, dos droit et respiration régulière."],
      },
    ],
  };
}

export function getFreeExerciseDbImageUrl(exerciseId: string, frameIndex: 0 | 1): string {
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseId}/${frameIndex}.jpg`;
}
