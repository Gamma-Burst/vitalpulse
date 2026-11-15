"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  evaluateMovementPose,
  type ExerciseMoveStep,
  type Vec3Deg,
} from "@/lib/exercise-biomechanics";
import { CameraViewPreset, MuscleGroupId } from "@/types/vitalpulse";

const DEG2RAD = Math.PI / 180;

const MUSCLE_KEYS: MuscleGroupId[] = [
  "chest",
  "upper_back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs_core",
  "obliques",
  "lower_back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "hip_flexors",
  "neck_traps",
  "cardio_heart",
];

const BASE_SKIN_COLOR = new THREE.Color(0x94a3b8);
const PRIMARY_IDLE_COLOR = new THREE.Color(0x10b981);
const PRIMARY_PEAK_COLOR = new THREE.Color(0xfb7185);
const SECONDARY_COLOR = new THREE.Color(0x38bdf8);
const NEUTRAL_EMISSIVE = new THREE.Color(0x0b1220);

function setEulerDeg(obj: THREE.Object3D, deg: Vec3Deg) {
  obj.rotation.set(deg[0] * DEG2RAD, deg[1] * DEG2RAD, deg[2] * DEG2RAD, "XYZ");
}

function getCameraAngles(preset: CameraViewPreset): { azimuth: number; polar: number; dist: number; targetY: number } {
  switch (preset) {
    case "front":
      return { azimuth: 0.16, polar: 0.22, dist: 3.15, targetY: 0.92 };
    case "side_profile":
      return { azimuth: 1.44, polar: 0.2, dist: 3.25, targetY: 0.9 };
    case "floor_low":
      return { azimuth: 1.05, polar: 0.34, dist: 2.95, targetY: 0.5 };
    default:
      return { azimuth: 0.68, polar: 0.25, dist: 3.15, targetY: 0.9 };
  }
}

export interface ExerciseCoach3DProps {
  move: ExerciseMoveStep;
  onWebGLUnavailable?: () => void;
}

export function ExerciseCoach3D({ move, onWebGLUnavailable }: ExerciseCoach3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const moveRef = useRef<ExerciseMoveStep>(move);
  moveRef.current = move;

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>(move.defaultCamera);
  const [repCount, setRepCount] = useState(1);
  const [hudState, setHudState] = useState<{
    isConcentric: boolean;
    contraction01: number;
    phase01: number;
  }>({ isConcentric: false, contraction01: 0.3, phase01: 0 });

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const cameraPresetRef = useRef<CameraViewPreset>(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  const userOrbitRef = useRef<{ yaw: number; pitch: number; dragging: boolean; lastX: number; lastY: number }>({
    yaw: 0,
    pitch: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Synchroniser caméra par défaut lors d'un changement de sous-mouvement
  const animClockRef = useRef<{ elapsedSec: number; prevRep: number }>({
    elapsedSec: 0,
    prevRep: 1,
  });

  useEffect(() => {
    setCameraPreset(move.defaultCamera);
    cameraPresetRef.current = move.defaultCamera;
    userOrbitRef.current.yaw = 0;
    userOrbitRef.current.pitch = 0;
    animClockRef.current = { elapsedSec: 0, prevRep: 1 };
    setRepCount(1);
  }, [move.id, move.defaultCamera]);

  const onUnavailableRef = useRef(onWebGLUnavailable);
  onUnavailableRef.current = onWebGLUnavailable;

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      onUnavailableRef.current?.();
      return;
    }

    const disposeGeos: THREE.BufferGeometry[] = [];
    const disposeMats: THREE.Material[] = [];

    const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposeGeos.push(g);
      return g;
    };
    const regMat = <T extends THREE.Material>(m: T): T => {
      disposeMats.push(m);
      return m;
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d19);
    scene.fog = new THREE.Fog(0x070d19, 5.5, 11.5);

    const width = Math.max(260, container.clientWidth || 360);
    const height = Math.max(220, container.clientHeight || 290);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 30);

    // Éclairage studio sportif
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.35));

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(2.5, 4.2, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2;
    scene.add(keyLight);

    const emeraldRim = new THREE.PointLight(0x10b981, 2.4, 7);
    emeraldRim.position.set(-2.2, 1.9, -1.8);
    scene.add(emeraldRim);

    const skyRim = new THREE.PointLight(0x38bdf8, 1.8, 7);
    skyRim.position.set(2.1, 1.6, -1.5);
    scene.add(skyRim);

    // Sol télémétrique FolloWeight
    const floorMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0x0b1324,
        roughness: 0.85,
        metalness: 0.12,
      })
    );
    const floorMesh = new THREE.Mesh(regGeo(new THREE.CircleGeometry(3.8, 48)), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const ringOuter = new THREE.Mesh(
      regGeo(new THREE.RingGeometry(1.18, 1.22, 64)),
      regMat(
        new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        })
      )
    );
    ringOuter.rotation.x = -Math.PI / 2;
    ringOuter.position.y = 0.004;
    scene.add(ringOuter);

    const gridHelper = new THREE.GridHelper(5, 16, 0x1e293b, 0x111c33);
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);

    // Matériaux du mannequin & muscles dynamiques
    const neutralSuitMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.55,
        metalness: 0.25,
      })
    );
    const jointArmorMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.45,
      })
    );
    const headMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.35,
        metalness: 0.15,
      })
    );
    const visorMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    const shoeMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.4,
        metalness: 0.1,
      })
    );

    const muscleMaterials = {} as Record<MuscleGroupId, THREE.MeshStandardMaterial>;
    for (const mKey of MUSCLE_KEYS) {
      muscleMaterials[mKey] = regMat(
        new THREE.MeshStandardMaterial({
          color: BASE_SKIN_COLOR.clone(),
          emissive: NEUTRAL_EMISSIVE.clone(),
          emissiveIntensity: 0.1,
          roughness: 0.42,
          metalness: 0.18,
        })
      );
    }

    function addPart(
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rot?: [number, number, number]
    ) {
      const m = new THREE.Mesh(regGeo(geo), mat);
      m.position.set(pos[0], pos[1], pos[2]);
      m.scale.set(scale[0], scale[1], scale[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }

    // Hiérarchie anatomique stricte à pivots articulaires
    const characterRoot = new THREE.Group();
    scene.add(characterRoot);

    const hips = new THREE.Group();
    hips.position.set(0, 0.92, 0);
    characterRoot.add(hips);

    // Bassin & Fessiers
    addPart(hips, new THREE.SphereGeometry(0.115, 18, 14), neutralSuitMat, [0, 0, 0], [1.18, 0.78, 0.86]);
    addPart(hips, new THREE.SphereGeometry(0.088, 14, 12), muscleMaterials.glutes, [0.07, -0.02, -0.06], [0.95, 1.0, 0.88]);
    addPart(hips, new THREE.SphereGeometry(0.088, 14, 12), muscleMaterials.glutes, [-0.07, -0.02, -0.06], [0.95, 1.0, 0.88]);

    // Spine (+Y vers haut)
    const spine = new THREE.Group();
    spine.position.set(0, 0.08, 0);
    hips.add(spine);
    addPart(spine, new THREE.CapsuleGeometry(0.085, 0.13, 6, 14), neutralSuitMat, [0, 0.1, 0], [1.12, 1.0, 0.78]);
    addPart(spine, new THREE.BoxGeometry(0.14, 0.15, 0.045), muscleMaterials.abs_core, [0, 0.11, 0.056]);
    addPart(spine, new THREE.BoxGeometry(0.045, 0.14, 0.095), muscleMaterials.obliques, [0.088, 0.1, 0]);
    addPart(spine, new THREE.BoxGeometry(0.045, 0.14, 0.095), muscleMaterials.obliques, [-0.088, 0.1, 0]);
    addPart(spine, new THREE.BoxGeometry(0.11, 0.13, 0.045), muscleMaterials.lower_back, [0, 0.1, -0.058]);

    // Torse / Cage thoracique (+Y)
    const chest = new THREE.Group();
    chest.position.set(0, 0.2, 0);
    spine.add(chest);
    addPart(chest, new THREE.CapsuleGeometry(0.105, 0.16, 8, 16), neutralSuitMat, [0, 0.12, 0], [1.32, 1.0, 0.78]);
    // Pectoraux
    addPart(chest, new THREE.SphereGeometry(0.072, 14, 12), muscleMaterials.chest, [0.068, 0.14, 0.065], [1.05, 0.88, 0.55]);
    addPart(chest, new THREE.SphereGeometry(0.072, 14, 12), muscleMaterials.chest, [-0.068, 0.14, 0.065], [1.05, 0.88, 0.55]);
    // Cœur cardio indicateur discret sur le sternum
    addPart(chest, new THREE.SphereGeometry(0.032, 12, 10), muscleMaterials.cardio_heart, [0.025, 0.15, 0.088], [1.0, 1.0, 0.5]);
    // Grand dorsal & Haut du dos
    addPart(chest, new THREE.SphereGeometry(0.082, 12, 10), muscleMaterials.lats, [0.085, 0.09, -0.048], [0.9, 1.28, 0.55]);
    addPart(chest, new THREE.SphereGeometry(0.082, 12, 10), muscleMaterials.lats, [-0.085, 0.09, -0.048], [0.9, 1.28, 0.55]);
    addPart(chest, new THREE.BoxGeometry(0.22, 0.13, 0.05), muscleMaterials.upper_back, [0, 0.16, -0.066]);

    // Cou & Tête (+Y)
    const neck = new THREE.Group();
    neck.position.set(0, 0.25, 0);
    chest.add(neck);
    addPart(neck, new THREE.CylinderGeometry(0.042, 0.048, 0.09, 12), jointArmorMat, [0, 0.035, 0]);
    addPart(neck, new THREE.SphereGeometry(0.065, 12, 10), muscleMaterials.neck_traps, [0, 0.015, -0.03], [1.75, 0.55, 0.65]);
    // Crâne + visière directionnelle vers +Z
    addPart(neck, new THREE.SphereGeometry(0.102, 20, 16), headMat, [0, 0.155, 0.008], [0.88, 1.05, 0.96]);
    addPart(neck, new THREE.BoxGeometry(0.13, 0.034, 0.05), visorMat, [0, 0.165, 0.082]);

    // Bras Gauche (+X) & Droit (-X) pendant vers -Y
    function createArm(side: 1 | -1) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.195, 0.19, 0);
      chest.add(shoulder);

      addPart(shoulder, new THREE.SphereGeometry(0.056, 14, 12), muscleMaterials.shoulders, [0, 0, 0], [1.05, 1.05, 1.0]);
      addPart(shoulder, new THREE.CapsuleGeometry(0.038, 0.19, 6, 12), neutralSuitMat, [0, -0.135, 0]);
      addPart(shoulder, new THREE.SphereGeometry(0.042, 12, 10), muscleMaterials.biceps, [0, -0.13, 0.022], [0.85, 1.65, 0.72]);
      addPart(shoulder, new THREE.SphereGeometry(0.042, 12, 10), muscleMaterials.triceps, [0, -0.125, -0.024], [0.85, 1.65, 0.72]);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.27, 0);
      shoulder.add(elbow);
      addPart(elbow, new THREE.SphereGeometry(0.036, 12, 10), jointArmorMat, [0, 0, 0]);
      addPart(elbow, new THREE.CapsuleGeometry(0.032, 0.18, 6, 12), muscleMaterials.forearms, [0, -0.125, 0]);

      const hand = new THREE.Group();
      hand.position.set(0, -0.25, 0);
      elbow.add(hand);
      addPart(hand, new THREE.SphereGeometry(0.034, 12, 10), headMat, [0, -0.02, 0], [0.85, 1.15, 0.65]);

      return { shoulder, elbow, hand };
    }

    const armL = createArm(1);
    const armR = createArm(-1);

    // Jambes Gauche (+X) & Droite (-X) pendant vers -Y
    function createLeg(side: 1 | -1) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.095, -0.05, 0);
      hips.add(hip);

      addPart(hip, new THREE.SphereGeometry(0.054, 12, 10), muscleMaterials.hip_flexors, [0, -0.03, 0.035], [0.95, 1.1, 0.7]);
      addPart(hip, new THREE.CapsuleGeometry(0.062, 0.28, 6, 14), neutralSuitMat, [0, -0.195, 0]);
      addPart(hip, new THREE.SphereGeometry(0.064, 12, 10), muscleMaterials.quads, [0, -0.185, 0.028], [0.92, 2.15, 0.72]);
      addPart(hip, new THREE.SphereGeometry(0.058, 12, 10), muscleMaterials.hamstrings, [0, -0.19, -0.028], [0.88, 2.05, 0.68]);

      const knee = new THREE.Group();
      knee.position.set(0, -0.39, 0);
      hip.add(knee);
      addPart(knee, new THREE.SphereGeometry(0.048, 12, 10), jointArmorMat, [0, 0, 0]);
      addPart(knee, new THREE.CapsuleGeometry(0.046, 0.27, 6, 12), neutralSuitMat, [0, -0.19, 0]);
      addPart(knee, new THREE.SphereGeometry(0.048, 12, 10), muscleMaterials.calves, [0, -0.15, -0.022], [0.88, 1.85, 0.8]);

      const ankle = new THREE.Group();
      ankle.position.set(0, -0.38, 0);
      knee.add(ankle);
      addPart(ankle, new THREE.BoxGeometry(0.088, 0.065, 0.21), shoeMat, [0, -0.032, 0.052]);

      const heelMarker = new THREE.Object3D();
      heelMarker.position.set(0, -0.065, -0.04);
      ankle.add(heelMarker);

      const toeMarker = new THREE.Object3D();
      toeMarker.position.set(0, -0.065, 0.155);
      ankle.add(toeMarker);

      const kneeMarker = new THREE.Object3D();
      kneeMarker.position.set(0, -0.045, 0.045);
      knee.add(kneeMarker);

      return { hip, knee, ankle, heelMarker, toeMarker, kneeMarker };
    }

    const legL = createLeg(1);
    const legR = createLeg(-1);

    // Marqueurs de contact sol (hanches, poitrine, mains)
    const pelvisMarker = new THREE.Object3D();
    pelvisMarker.position.set(0, -0.11, -0.06);
    hips.add(pelvisMarker);

    const upperBackMarker = new THREE.Object3D();
    upperBackMarker.position.set(0, 0.14, -0.11);
    chest.add(upperBackMarker);

    const chestFrontMarker = new THREE.Object3D();
    chestFrontMarker.position.set(0, 0.14, 0.11);
    chest.add(chestFrontMarker);

    const palmMarkerL = new THREE.Object3D();
    palmMarkerL.position.set(0, -0.055, 0);
    armL.hand.add(palmMarkerL);

    const palmMarkerR = new THREE.Object3D();
    palmMarkerR.position.set(0, -0.055, 0);
    armR.hand.add(palmMarkerR);

    const contactMarkers = [
      legL.heelMarker,
      legL.toeMarker,
      legL.kneeMarker,
      legR.heelMarker,
      legR.toeMarker,
      legR.kneeMarker,
      pelvisMarker,
      upperBackMarker,
      chestFrontMarker,
      palmMarkerL,
      palmMarkerR,
    ];

    // === Accessoires 3D contextuels ===
    const propsRoot = new THREE.Group();
    scene.add(propsRoot);

    const metalMat = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.25 }));
    const accentGoldMat = regMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.35 }));
    const rackDarkMat = regMat(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.5 }));
    const benchPadMat = regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
    const matTealMat = regMat(new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.78 }));

    // Haltères dans chaque main
    const makeDumbbell = () => {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 10)), metalMat);
      handle.rotation.z = Math.PI / 2;
      const p1 = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.032, 14)), accentGoldMat);
      p1.rotation.z = Math.PI / 2;
      p1.position.x = 0.08;
      const p2 = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.032, 14)), accentGoldMat);
      p2.rotation.z = Math.PI / 2;
      p2.position.x = -0.08;
      g.add(handle, p1, p2);
      return g;
    };
    const dbL = makeDumbbell();
    const dbR = makeDumbbell();
    armL.hand.add(dbL);
    armR.hand.add(dbR);

    // Barre olympique (positionnée dynamiquement entre les mains)
    const barbellGroup = new THREE.Group();
    const barShaft = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.018, 0.018, 1.35, 12)), metalMat);
    barShaft.rotation.z = Math.PI / 2;
    const plateL = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 20)), accentGoldMat);
    plateL.rotation.z = Math.PI / 2;
    plateL.position.x = 0.58;
    const plateR = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 20)), accentGoldMat);
    plateR.rotation.z = Math.PI / 2;
    plateR.position.x = -0.58;
    barbellGroup.add(barShaft, plateL, plateR);
    propsRoot.add(barbellGroup);

    // Banc de musculation
    const benchGroup = new THREE.Group();
    const benchTop = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.32, 0.08, 1.15)), benchPadMat);
    benchTop.position.set(0, 0.44, -0.25);
    const benchLeg1 = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.06, 0.42, 0.06)), rackDarkMat);
    benchLeg1.position.set(0, 0.21, 0.22);
    const benchLeg2 = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.06, 0.42, 0.06)), rackDarkMat);
    benchLeg2.position.set(0, 0.21, -0.72);
    benchGroup.add(benchTop, benchLeg1, benchLeg2);
    propsRoot.add(benchGroup);

    // Barre de traction
    const pullupGroup = new THREE.Group();
    const topBar = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 12)), metalMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.15, 0.02);
    const pPostL = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.028, 0.028, 2.2, 10)), rackDarkMat);
    pPostL.position.set(0.56, 1.1, 0.02);
    const pPostR = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.028, 0.028, 2.2, 10)), rackDarkMat);
    pPostR.position.set(-0.56, 1.1, 0.02);
    pullupGroup.add(topBar, pPostL, pPostR);
    propsRoot.add(pullupGroup);

    // Barres parallèles dips
    const dipGroup = new THREE.Group();
    const dBarL = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.85, 10)), metalMat);
    dBarL.rotation.x = Math.PI / 2;
    dBarL.position.set(0.28, 1.06, 0);
    const dBarR = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.85, 10)), metalMat);
    dBarR.rotation.x = Math.PI / 2;
    dBarR.position.set(-0.28, 1.06, 0);
    const dLeg1 = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.024, 0.024, 1.06, 8)), rackDarkMat);
    dLeg1.position.set(0.28, 0.53, -0.35);
    const dLeg2 = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.024, 0.024, 1.06, 8)), rackDarkMat);
    dLeg2.position.set(-0.28, 0.53, -0.35);
    dipGroup.add(dBarL, dBarR, dLeg1, dLeg2);
    propsRoot.add(dipGroup);

    // Chaise
    const chairGroup = new THREE.Group();
    const cSeat = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.46, 0.05, 0.44)), benchPadMat);
    cSeat.position.set(0, 0.46, -0.05);
    const cBack = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.46, 0.45, 0.05)), rackDarkMat);
    cBack.position.set(0, 0.7, -0.25);
    for (const cx of [-0.19, 0.19]) {
      for (const cz of [-0.24, 0.13]) {
        const leg = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.04, 0.44, 0.04)), rackDarkMat);
        leg.position.set(cx, 0.22, cz);
        chairGroup.add(leg);
      }
    }
    chairGroup.add(cSeat, cBack);
    propsRoot.add(chairGroup);

    // Mur pompes
    const wallMesh = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(1.4, 2.0, 0.08)),
      regMat(
        new THREE.MeshStandardMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.45,
          roughness: 0.6,
        })
      )
    );
    wallMesh.position.set(0, 1.0, 0.88);
    propsRoot.add(wallMesh);

    // Escaliers VILPA
    const stairsGroup = new THREE.Group();
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.9, 0.16, 0.34)), rackDarkMat);
      step.position.set(0, 0.08 + s * 0.16, 0.25 + s * 0.32);
      stairsGroup.add(step);
    }
    propsRoot.add(stairsGroup);

    // Tapis de yoga
    const yogaMatMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.72, 0.016, 1.78)), matTealMat);
    yogaMatMesh.position.set(0, 0.008, 0.05);
    yogaMatMesh.receiveShadow = true;
    propsRoot.add(yogaMatMesh);

    // Eau piscine
    const poolWaterMesh = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(2.6, 0.03, 2.6)),
      regMat(
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.32,
          roughness: 0.15,
        })
      )
    );
    poolWaterMesh.position.set(0, 0.45, 0);
    propsRoot.add(poolWaterMesh);

    // Vélo d'appartement / route
    const bikeGroup = new THREE.Group();
    const bikeWheelFront = new THREE.Mesh(regGeo(new THREE.TorusGeometry(0.28, 0.025, 10, 28)), metalMat);
    bikeWheelFront.rotation.y = Math.PI / 2;
    bikeWheelFront.position.set(0, 0.32, 0.56);
    const bikeWheelBack = new THREE.Mesh(regGeo(new THREE.TorusGeometry(0.28, 0.025, 10, 28)), metalMat);
    bikeWheelBack.rotation.y = Math.PI / 2;
    bikeWheelBack.position.set(0, 0.32, -0.45);
    const bikeFrame = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.06, 0.06, 0.96)), accentGoldMat);
    bikeFrame.position.set(0, 0.62, 0.06);
    const bikePost = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8)), rackDarkMat);
    bikePost.position.set(0, 0.92, 0.46);
    const bikeHandlebar = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8)), metalMat);
    bikeHandlebar.rotation.z = Math.PI / 2;
    bikeHandlebar.position.set(0, 1.15, 0.46);
    bikeGroup.add(bikeWheelFront, bikeWheelBack, bikeFrame, bikePost, bikeHandlebar);
    propsRoot.add(bikeGroup);

    // Rameur ergomètre
    const rowerGroup = new THREE.Group();
    const rowerRail = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.12, 0.08, 1.65)), metalMat);
    rowerRail.position.set(0, 0.3, 0.15);
    const rowerWheel = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20)), rackDarkMat);
    rowerWheel.rotation.z = Math.PI / 2;
    rowerWheel.position.set(0, 0.46, 0.92);
    const rowerSeat = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.28, 0.05, 0.24)), benchPadMat);
    rowerSeat.position.set(0, 0.38, 0);
    const rowerHandle = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.38, 8)), accentGoldMat);
    rowerHandle.rotation.z = Math.PI / 2;
    rowerGroup.add(rowerRail, rowerWheel, rowerSeat, rowerHandle);
    propsRoot.add(rowerGroup);

    // Sac de frappe
    const bagGroup = new THREE.Group();
    bagGroup.position.set(0, 2.2, 0.72);
    const bagChain = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 8)), metalMat);
    bagChain.position.y = -0.32;
    const bagBody = new THREE.Mesh(
      regGeo(new THREE.CapsuleGeometry(0.17, 0.78, 8, 16)),
      regMat(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 }))
    );
    bagBody.position.y = -1.0;
    bagGroup.add(bagChain, bagBody);
    propsRoot.add(bagGroup);

    // Mur d'escalade
    const climbGroup = new THREE.Group();
    const climbBoard = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.5, 2.4, 0.08)), rackDarkMat);
    climbBoard.position.set(0, 1.2, 0.46);
    climbBoard.rotation.x = -0.14;
    const holdColors = [0x10b981, 0xf59e0b, 0xfb7185, 0x38bdf8];
    [
      [-0.35, 0.45],
      [0.32, 0.7],
      [-0.25, 1.3],
      [0.35, 1.55],
      [-0.3, 1.95],
      [0.26, 2.15],
    ].forEach(([hx, hy], idx) => {
      const h = new THREE.Mesh(
        regGeo(new THREE.SphereGeometry(0.048, 10, 8)),
        regMat(new THREE.MeshStandardMaterial({ color: holdColors[idx % holdColors.length], roughness: 0.5 }))
      );
      h.position.set(hx, hy, 0.41 - hy * 0.12);
      climbGroup.add(h);
    });
    climbGroup.add(climbBoard);
    propsRoot.add(climbGroup);

    // Kettlebell, Raquette, Ballons, Bâtons, Corde
    const kettlebellMesh = new THREE.Mesh(
      regGeo(new THREE.SphereGeometry(0.11, 14, 12)),
      regMat(new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.45, roughness: 0.35 }))
    );
    propsRoot.add(kettlebellMesh);

    const racketGroup = new THREE.Group();
    const rShaft = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8)), accentGoldMat);
    rShaft.position.y = -0.17;
    const rHead = new THREE.Mesh(regGeo(new THREE.TorusGeometry(0.12, 0.014, 8, 22)), accentGoldMat);
    rHead.position.y = -0.44;
    racketGroup.add(rShaft, rHead);
    armR.hand.add(racketGroup);

    const soccerBall = new THREE.Mesh(
      regGeo(new THREE.IcosahedronGeometry(0.11, 1)),
      regMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }))
    );
    propsRoot.add(soccerBall);

    const basketBall = new THREE.Mesh(
      regGeo(new THREE.SphereGeometry(0.12, 16, 12)),
      regMat(new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55 }))
    );
    propsRoot.add(basketBall);

    const ropeLineGeo = regGeo(new THREE.BufferGeometry());
    const ropePts = new Float32Array(17 * 3);
    ropeLineGeo.setAttribute("position", new THREE.BufferAttribute(ropePts, 3));
    const ropeLine = new THREE.Line(
      ropeLineGeo,
      regMat(new THREE.LineBasicMaterial({ color: 0xfbbf24 }))
    );
    propsRoot.add(ropeLine);

    const backpackMesh = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(0.24, 0.32, 0.14)),
      regMat(new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 }))
    );
    backpackMesh.position.set(0, 0.1, -0.15);
    chest.add(backpackMesh);

    // Boucle de rendu principale
    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();
    const tempMid = new THREE.Vector3();
    const tempDir = new THREE.Vector3();
    const xAxis = new THREE.Vector3(1, 0, 0);

    const camPos = new THREE.Vector3(1.6, 1.5, 2.7);
    const camTarget = new THREE.Vector3(0, 0.9, 0);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(240, Math.round(entry.contentRect.width));
        const h = Math.max(200, Math.round(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    ro.observe(container);

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const curMove = moveRef.current;
      const cycleSec = Math.max(0.65, curMove.cycleSeconds);
      if (isPlayingRef.current) {
        animClockRef.current.elapsedSec += dt * speedRef.current;
      }

      const rawCycles = animClockRef.current.elapsedSec / cycleSec;
      const rep = Math.floor(rawCycles) + 1;
      const phase01 = rawCycles - Math.floor(rawCycles);
      if (rep !== animClockRef.current.prevRep) {
        animClockRef.current.prevRep = rep;
        setRepCount(rep);
      }

      const pose = evaluateMovementPose(curMove.archetype, phase01);
      const j = pose.joints;

      setEulerDeg(hips, j.hips);
      hips.position.set(
        pose.hipsPosOffset[0],
        0.92 + pose.hipsPosOffset[1],
        pose.hipsPosOffset[2]
      );
      setEulerDeg(spine, j.spine);
      setEulerDeg(chest, j.chest);
      setEulerDeg(neck, j.neck);
      setEulerDeg(armL.shoulder, j.shoulderL);
      setEulerDeg(armL.elbow, j.elbowL);
      setEulerDeg(armR.shoulder, j.shoulderR);
      setEulerDeg(armR.elbow, j.elbowR);
      setEulerDeg(legL.hip, j.hipL);
      setEulerDeg(legL.knee, j.kneeL);
      setEulerDeg(legL.ankle, j.ankleL);
      setEulerDeg(legR.hip, j.hipR);
      setEulerDeg(legR.knee, j.kneeR);
      setEulerDeg(legR.ankle, j.ankleR);

      // Mise à jour surbrillance musculaire synchronisée avec la contraction
      for (const mKey of MUSCLE_KEYS) {
        const mat = muscleMaterials[mKey];
        if (curMove.primaryMuscles.includes(mKey)) {
          mat.color.copy(PRIMARY_IDLE_COLOR).lerp(PRIMARY_PEAK_COLOR, pose.contraction01);
          mat.emissive.copy(mat.color);
          mat.emissiveIntensity = 0.35 + pose.contraction01 * 0.65;
        } else if (curMove.secondaryMuscles.includes(mKey)) {
          mat.color.copy(SECONDARY_COLOR);
          mat.emissive.copy(SECONDARY_COLOR);
          mat.emissiveIntensity = 0.25 + pose.contraction01 * 0.15;
        } else {
          mat.color.copy(BASE_SKIN_COLOR);
          mat.emissive.copy(NEUTRAL_EMISSIVE);
          mat.emissiveIntensity = 0.08;
        }
      }

      // Grounding automatique au sol / barre / banc / rameur
      characterRoot.position.y = 0;
      characterRoot.updateMatrixWorld(true);

      if (pose.groundMode === "hanging") {
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        const midY = (tempV1.y + tempV2.y) * 0.5;
        characterRoot.position.y = 2.13 - midY;
      } else if (pose.groundMode === "dip_bars") {
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        const midY = (tempV1.y + tempV2.y) * 0.5;
        characterRoot.position.y = 1.08 - midY;
      } else if (pose.groundMode === "seated") {
        hips.getWorldPosition(tempV1);
        let seatHeight = 0.5;
        if (curMove.prop === "bench_dumbbells") seatHeight = 0.54;
        else if (curMove.prop === "rower") seatHeight = 0.44;
        else if (curMove.prop === "bike") seatHeight = 0.74;
        characterRoot.position.y = seatHeight - tempV1.y;
      } else {
        let minY = Infinity;
        for (const marker of contactMarkers) {
          marker.getWorldPosition(tempV1);
          if (tempV1.y < minY) minY = tempV1.y;
        }
        characterRoot.position.y = -minY + pose.liftY;
      }

      characterRoot.updateMatrixWorld(true);

      // Visibilité & animation des accessoires contextuels
      const p = curMove.prop;
      dbL.visible = p === "dumbbells" || p === "bench_dumbbells";
      dbR.visible = p === "dumbbells" || p === "bench_dumbbells";
      barbellGroup.visible = p === "barbell";
      benchGroup.visible = p === "bench_dumbbells";
      pullupGroup.visible = p === "pullup_bar";
      dipGroup.visible = p === "dip_bars";
      chairGroup.visible = p === "chair";
      wallMesh.visible = p === "wall";
      stairsGroup.visible = p === "stairs";
      yogaMatMesh.visible = p === "yoga_mat";
      poolWaterMesh.visible = p === "pool_water";
      bikeGroup.visible = p === "bike";
      rowerGroup.visible = p === "rower";
      bagGroup.visible = p === "punching_bag";
      climbGroup.visible = p === "climbing_wall";
      kettlebellMesh.visible = p === "kettlebell";
      racketGroup.visible = p === "racket";
      soccerBall.visible = p === "soccer_ball";
      basketBall.visible = p === "basketball";
      ropeLine.visible = p === "jump_rope";
      backpackMesh.visible = p === "backpack_poles";

      if (barbellGroup.visible) {
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        tempMid.addVectors(tempV1, tempV2).multiplyScalar(0.5);
        barbellGroup.position.copy(tempMid);
        tempDir.subVectors(tempV1, tempV2).normalize();
        barbellGroup.quaternion.setFromUnitVectors(xAxis, tempDir);
      }

      if (kettlebellMesh.visible) {
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        kettlebellMesh.position.addVectors(tempV1, tempV2).multiplyScalar(0.5);
        kettlebellMesh.position.y -= 0.08;
      }

      if (bikeGroup.visible) {
        bikeWheelFront.rotation.x += dt * 9;
        bikeWheelBack.rotation.x += dt * 9;
      }

      if (rowerGroup.visible) {
        hips.getWorldPosition(tempV1);
        rowerSeat.position.z = tempV1.z;
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        rowerHandle.position.addVectors(tempV1, tempV2).multiplyScalar(0.5);
        rowerWheel.rotation.x += dt * 11;
      }

      if (bagGroup.visible) {
        const impact = pose.contraction01 > 0.72 ? (pose.contraction01 - 0.72) * 0.65 : 0;
        bagGroup.rotation.x = THREE.MathUtils.lerp(bagGroup.rotation.x, -impact, 0.2);
      }

      if (soccerBall.visible) {
        const roll = phase01 > 0.42 ? Math.sin((phase01 - 0.42) * Math.PI) * 0.45 : 0;
        soccerBall.position.set(-0.08, 0.11 + roll * 0.28, 0.42 + roll * 0.9);
      }

      if (basketBall.visible) {
        if (pose.contraction01 > 0.78) {
          const arcT = (pose.contraction01 - 0.78) / 0.22;
          palmMarkerR.getWorldPosition(tempV1);
          basketBall.position.set(tempV1.x, tempV1.y + 0.12 + arcT * 0.55, tempV1.z + arcT * 0.65);
        } else {
          palmMarkerR.getWorldPosition(tempV1);
          basketBall.position.set(tempV1.x, tempV1.y + 0.08, tempV1.z + 0.06);
        }
      }

      if (ropeLine.visible) {
        palmMarkerL.getWorldPosition(tempV1);
        palmMarkerR.getWorldPosition(tempV2);
        const attr = ropeLineGeo.getAttribute("position") as THREE.BufferAttribute;
        const angle = phase01 * Math.PI * 2;
        const sagY = -Math.cos(angle) * 1.15;
        const sagZ = Math.sin(angle) * 0.85;
        for (let k = 0; k <= 16; k++) {
          const u = k / 16;
          const arc = Math.sin(u * Math.PI);
          const rx = THREE.MathUtils.lerp(tempV2.x, tempV1.x, u);
          const ry = Math.max(0.02, THREE.MathUtils.lerp(tempV2.y, tempV1.y, u) + arc * sagY);
          const rz = THREE.MathUtils.lerp(tempV2.z, tempV1.z, u) + arc * sagZ;
          attr.setXYZ(k, rx, ry, rz);
        }
        attr.needsUpdate = true;
      }

      // Caméra douce combinant preset + orbite tactile
      const presetCfg = getCameraAngles(cameraPresetRef.current);
      const az = presetCfg.azimuth + userOrbitRef.current.yaw;
      const pol = THREE.MathUtils.clamp(presetCfg.polar + userOrbitRef.current.pitch, 0.04, 0.85);
      const r = presetCfg.dist;

      const desiredPos = new THREE.Vector3(
        Math.sin(az) * Math.cos(pol) * r,
        presetCfg.targetY + Math.sin(pol) * r,
        Math.cos(az) * Math.cos(pol) * r
      );
      const desiredTarget = new THREE.Vector3(0, presetCfg.targetY, 0);

      const damp = 1 - Math.exp(-8 * dt);
      camPos.lerp(desiredPos, damp);
      camTarget.lerp(desiredTarget, damp);
      camera.position.copy(camPos);
      camera.lookAt(camTarget);

      renderer.render(scene, camera);

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setHudState({
          isConcentric: pose.isConcentric,
          contraction01: pose.contraction01,
          phase01: pose.phase01,
        });
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      for (const g of disposeGeos) g.dispose();
      for (const m of disposeMats) m.dispose();
      renderer.dispose();
    };
  }, []);

  const cueText = useMemo(
    () => (hudState.isConcentric ? move.breathingCue.concentric : move.breathingCue.eccentric),
    [hudState.isConcentric, move.breathingCue]
  );

  return (
    <div className="vp-keep-dark overflow-hidden rounded-2xl border border-emerald-400/25 bg-slate-950 shadow-lg">
      {/* Barre supérieure contrôles caméra & vitesse */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/90 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: "three_quarter", label: "Vue 3/4" },
              { id: "side_profile", label: "Profil" },
              { id: "front", label: "Face" },
            ] as Array<{ id: CameraViewPreset; label: string }>
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => {
                setCameraPreset(cam.id);
                userOrbitRef.current.yaw = 0;
                userOrbitRef.current.pitch = 0;
              }}
              className={`rounded-lg px-2 py-1 font-semibold transition ${
                cameraPreset === cam.id
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
            className={`rounded-lg border px-2 py-1 font-bold tabular-nums transition ${
              speed === 0.5
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"
            }`}
          >
            {speed === 0.5 ? "0.5× Ralenti" : "1× Tempo"}
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Mettre l'animation en pause" : "Lire l'animation"}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 font-bold text-slate-950 hover:bg-emerald-400"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? "Pause" : "Lire"}
          </button>
          <button
            type="button"
            onClick={() => {
              userOrbitRef.current.yaw = 0;
              userOrbitRef.current.pitch = 0;
            }}
            title="Recentrer la caméra"
            aria-label="Recentrer la caméra"
            className="rounded-lg bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scène 3D interactive tactile */}
      <div className="relative h-64 sm:h-72 w-full select-none">
        <div
          ref={hostRef}
          onPointerDown={(e) => {
            userOrbitRef.current.dragging = true;
            userOrbitRef.current.lastX = e.clientX;
            userOrbitRef.current.lastY = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!userOrbitRef.current.dragging) return;
            const dx = e.clientX - userOrbitRef.current.lastX;
            const dy = e.clientY - userOrbitRef.current.lastY;
            userOrbitRef.current.lastX = e.clientX;
            userOrbitRef.current.lastY = e.clientY;
            userOrbitRef.current.yaw -= dx * 0.012;
            userOrbitRef.current.pitch = Math.max(-0.22, Math.min(0.6, userOrbitRef.current.pitch + dy * 0.008));
          }}
          onPointerUp={(e) => {
            userOrbitRef.current.dragging = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // Ignore si déjà relâché
            }
          }}
          onPointerCancel={() => {
            userOrbitRef.current.dragging = false;
          }}
          style={{ touchAction: "none" }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />

        {/* Badge Répétition + Indication de glisser pour tourner */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/40 bg-slate-950/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 backdrop-blur tabular-nums">
            Rép. #{repCount}
          </span>
          <span className="hidden sm:inline-block rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] text-slate-400">
            Glissez pour tourner à 360°
          </span>
        </div>

        {/* Badge phase effort */}
        <div className="pointer-events-none absolute top-2.5 right-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${
              hudState.isConcentric
                ? "border border-rose-400/45 bg-rose-500/20 text-rose-200"
                : "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
            }`}
          >
            {hudState.isConcentric ? "Effort / Contraction" : "Retour maîtrisé"}
          </span>
        </div>
      </div>

      {/* Barre inférieure synchronisation respiration & phase */}
      <div className="border-t border-slate-800/90 bg-slate-900/95 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-white truncate">{cueText}</span>
          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
            Tempo {move.cycleSeconds.toFixed(1)} s
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-[background-color] duration-200 ${
              hudState.isConcentric ? "bg-rose-400" : "bg-emerald-400"
            }`}
            style={{ width: `${Math.round(hudState.phase01 * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
