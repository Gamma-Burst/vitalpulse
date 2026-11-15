import { describe, expect, it } from "vitest";
import { EXERCISES_COMPENDIUM } from "@/data/exercises-compendium";
import {
  evaluateMovementPose,
  EXERCISE_VISUAL_SPECS,
  getExerciseVisualSpec,
  getFreeExerciseDbImageUrl,
  JointPoseMap,
  MOVEMENT_ARCHETYPES,
  MUSCLE_LABELS_FR,
} from "@/lib/exercise-biomechanics";

const SAMPLE_PHASES = [0, 0.25, 0.5, 0.75, 0.999] as const;
const JOINT_KEYS: Array<keyof JointPoseMap> = [
  "hips",
  "spine",
  "chest",
  "neck",
  "shoulderL",
  "shoulderR",
  "elbowL",
  "elbowR",
  "hipL",
  "hipR",
  "kneeL",
  "kneeR",
  "ankleL",
  "ankleR",
];

describe("exercise-biomechanics", () => {
  it("couvre explicitement les 44 exercices de EXERCISES_COMPENDIUM", () => {
    expect(EXERCISES_COMPENDIUM.length).toBe(44);

    for (const ex of EXERCISES_COMPENDIUM) {
      const explicitSpec = EXERCISE_VISUAL_SPECS[ex.id];
      expect(explicitSpec, `Spec explicite manquante pour ${ex.id}`).toBeDefined();

      const resolved = getExerciseVisualSpec(ex);
      expect(resolved.exerciseId).toBe(ex.id);
      expect(resolved.movements.length).toBeGreaterThanOrEqual(1);

      for (const mv of resolved.movements) {
        expect(MOVEMENT_ARCHETYPES[mv.archetype], `Archétype inconnu ${mv.archetype}`).toBeDefined();
        expect(mv.labelFr.trim().length).toBeGreaterThan(2);
        expect(mv.cycleSeconds).toBeGreaterThan(0);
        expect(mv.primaryMuscles.length).toBeGreaterThanOrEqual(1);
        for (const m of [...mv.primaryMuscles, ...mv.secondaryMuscles]) {
          expect(MUSCLE_LABELS_FR[m]).toBeTruthy();
        }
        expect(mv.postureTips.length).toBeGreaterThanOrEqual(1);
        for (const tip of mv.postureTips) {
          expect(tip.trim().length).toBeGreaterThan(3);
        }
        expect(mv.breathingCue.eccentric.trim().length).toBeGreaterThan(2);
        expect(mv.breathingCue.concentric.trim().length).toBeGreaterThan(2);

        if (mv.freeExerciseDbId) {
          const url0 = getFreeExerciseDbImageUrl(mv.freeExerciseDbId, 0);
          const url1 = getFreeExerciseDbImageUrl(mv.freeExerciseDbId, 1);
          expect(url0).toMatch(
            /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/main\/exercises\/.+\/0\.jpg$/
          );
          expect(url1).toMatch(
            /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/main\/exercises\/.+\/1\.jpg$/
          );
        }
      }
    }
  });

  it("produit des poses finies, sans hyperextension du genou et continues en boucle pour tous les sous-mouvements", () => {
    for (const ex of EXERCISES_COMPENDIUM) {
      const spec = getExerciseVisualSpec(ex);
      for (const mv of spec.movements) {
        const samples = SAMPLE_PHASES.map((p) => evaluateMovementPose(mv.archetype, p));

        for (const pose of samples) {
          expect(Number.isFinite(pose.liftY)).toBe(true);
          expect(Number.isFinite(pose.contraction01)).toBe(true);
          expect(pose.contraction01).toBeGreaterThanOrEqual(0);
          expect(pose.contraction01).toBeLessThanOrEqual(1);

          for (const v of pose.hipsPosOffset) {
            expect(Number.isFinite(v)).toBe(true);
          }

          for (const key of JOINT_KEYS) {
            const vec = pose.joints[key];
            expect(vec).toHaveLength(3);
            for (const angle of vec) {
              expect(Number.isFinite(angle)).toBe(true);
            }
          }

          // Anatomie : flexion du genou >= -5° et <= 155° (pas de genou retourné en arrière)
          expect(
            pose.joints.kneeL[0],
            `${ex.id}/${mv.id} kneeL[0]=${pose.joints.kneeL[0]}`
          ).toBeGreaterThanOrEqual(-5);
          expect(
            pose.joints.kneeL[0],
            `${ex.id}/${mv.id} kneeL[0]=${pose.joints.kneeL[0]}`
          ).toBeLessThanOrEqual(155);
          expect(
            pose.joints.kneeR[0],
            `${ex.id}/${mv.id} kneeR[0]=${pose.joints.kneeR[0]}`
          ).toBeGreaterThanOrEqual(-5);
          expect(
            pose.joints.kneeR[0],
            `${ex.id}/${mv.id} kneeR[0]=${pose.joints.kneeR[0]}`
          ).toBeLessThanOrEqual(155);
        }

        // Vérifier que l'animation bouge réellement pendant le cycle (entre t=0 et t=0.25/0.5/0.75)
        const startPose = samples[0];
        let maxJointDelta = 0;
        let maxOffsetDelta = 0;
        for (const midPose of [samples[1], samples[2], samples[3]]) {
          for (const key of JOINT_KEYS) {
            for (let axis = 0; axis < 3; axis++) {
              const d = Math.abs(midPose.joints[key][axis] - startPose.joints[key][axis]);
              if (d > maxJointDelta) maxJointDelta = d;
            }
          }
          for (let axis = 0; axis < 3; axis++) {
            const od = Math.abs(midPose.hipsPosOffset[axis] - startPose.hipsPosOffset[axis]);
            if (od > maxOffsetDelta) maxOffsetDelta = od;
          }
          const ld = Math.abs(midPose.liftY - startPose.liftY);
          if (ld > maxOffsetDelta) maxOffsetDelta = ld;
        }
        expect(
          maxJointDelta > 0.5 || maxOffsetDelta > 0.01,
          `${ex.id}/${mv.id} semble figé (maxJointDelta=${maxJointDelta}, maxOffsetDelta=${maxOffsetDelta})`
        ).toBe(true);

        // Continuité de boucle entre t=0 et t=0.999
        const endPose = samples[4];
        for (const key of JOINT_KEYS) {
          for (let axis = 0; axis < 3; axis++) {
            const loopDelta = Math.abs(endPose.joints[key][axis] - startPose.joints[key][axis]);
            expect(
              loopDelta,
              `${ex.id}/${mv.id} saut de boucle sur ${key}[${axis}]: ${loopDelta}`
            ).toBeLessThanOrEqual(15);
          }
        }
        for (let axis = 0; axis < 3; axis++) {
          const offsetLoopDelta = Math.abs(
            endPose.hipsPosOffset[axis] - startPose.hipsPosOffset[axis]
          );
          expect(offsetLoopDelta).toBeLessThanOrEqual(0.08);
        }
        expect(Math.abs(endPose.liftY - startPose.liftY)).toBeLessThanOrEqual(0.08);
      }
    }
  });
});
