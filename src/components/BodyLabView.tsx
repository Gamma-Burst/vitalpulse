"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Camera,
  Check,
  Columns,
  Copy,
  Droplet,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Lock,
  Pause,
  Play,
  Plus,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  BIOMARKER_CATALOG,
} from "@/lib/blood-panel-engine";
import {
  buildNormalizedBase100Series,
  computeBodyComposition,
  MEASUREMENT_SITE_META,
  MeasurementSiteKey,
} from "@/lib/body-composition";
import { processBodyProgressPhoto } from "@/lib/native-bridge";
import {
  deleteBodyPhotoDataUrl,
  loadBodyPhotoDataUrl,
  saveBodyPhotoDataUrl,
} from "@/lib/storage-db";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { resolveBloodGlossaryId } from "@/data/glossary-terms";
import {
  BloodBiomarkerKey,
  BloodMarkerInput,
  BloodMarkerStatus,
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoAngle,
  BodyPhotoMeta,
  UserProfile,
  WeightEntry,
} from "@/types/vitalpulse";

export type BodyLabSubTab = "measurements" | "blood" | "photos";

interface BodyLabViewProps {
  profile: UserProfile;
  todayDateKey: string;
  weights: WeightEntry[];
  measurements: BodyMeasurementEntry[];
  bloodPanels: BloodPanelEntry[];
  bodyPhotoMetas: BodyPhotoMeta[];
  initialSubTab?: BodyLabSubTab;
  onSaveMeasurement: (entry: BodyMeasurementEntry) => void;
  onDeleteMeasurement: (id: string) => void;
  onSaveBloodPanel: (panel: BloodPanelEntry) => void;
  onDeleteBloodPanel: (id: string) => void;
  onSaveBodyPhotoMeta: (meta: BodyPhotoMeta) => void;
  onDeleteBodyPhotoMeta: (id: string) => void;
}

const ANGLE_LABELS: Record<BodyPhotoAngle, string> = {
  front: "Face",
  side: "Profil",
  back: "Dos",
};

const QUICK_BLOOD_KEYS: BloodBiomarkerKey[] = [
  "fastingGlucose",
  "hba1c",
  "fastingInsulin",
  "totalCholesterol",
  "hdlCholesterol",
  "ldlCholesterol",
  "triglycerides",
  "creatinine",
  "alat",
  "asat",
  "platelets",
  "ferritin",
  "tsh",
  "crpUs",
  "vitD",
  "hemoglobin",
];

function statusBadgeClass(status: BloodMarkerStatus | "optimal" | "normal" | "watch" | "high_priority"): string {
  switch (status) {
    case "optimal":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
    case "normal":
      return "bg-sky-500/20 text-sky-300 border-sky-400/40";
    case "watch":
      return "bg-amber-500/20 text-amber-300 border-amber-400/40";
    case "high_priority":
      return "bg-orange-500/25 text-orange-300 border-orange-400/50";
    case "critical":
      return "bg-rose-500/30 text-rose-200 border-rose-400/70";
    default:
      return "bg-slate-700/50 text-slate-300 border-slate-600";
  }
}

function statusLabelFr(status: BloodMarkerStatus): string {
  switch (status) {
    case "optimal":
      return "Optimal";
    case "normal":
      return "Dans la norme";
    case "watch":
      return "À surveiller";
    case "high_priority":
      return "Prioritaire";
    case "critical":
      return "Alerte urgente";
    case "uninterpretable_non_fasting":
      return "Hors jeûne";
  }
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-[11px] text-slate-500">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.1, max - min);
  const w = 68;
  const h = 22;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block align-middle">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function BodyLabView({
  profile,
  todayDateKey,
  weights,
  measurements,
  bloodPanels,
  bodyPhotoMetas,
  initialSubTab = "measurements",
  onSaveMeasurement,
  onDeleteMeasurement,
  onSaveBloodPanel,
  onDeleteBloodPanel,
  onSaveBodyPhotoMeta,
  onDeleteBodyPhotoMeta,
}: BodyLabViewProps) {
  const [subTab, setSubTab] = useState<BodyLabSubTab>(initialSubTab);
  const [measSheetOpen, setMeasSheetOpen] = useState(false);
  const [bloodSheetOpen, setBloodSheetOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // ---------------- 1. MENSURATIONS ----------------
  const sortedMeas = useMemo(
    () => [...measurements].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [measurements]
  );
  const latestMeas = sortedMeas[sortedMeas.length - 1];
  const firstMeas = sortedMeas[0];

  const [mDate, setMDate] = useState(todayDateKey);
  const [mWeight, setMWeight] = useState(String(latestMeas?.weightKg ?? profile.weightKg));
  const [mWaist, setMWaist] = useState(String(latestMeas?.waistCm ?? profile.waistCm ?? ""));
  const [mHips, setMHips] = useState(String(latestMeas?.hipsCm ?? ""));
  const [mChest, setMChest] = useState(String(latestMeas?.chestCm ?? ""));
  const [mShoulders, setMShoulders] = useState(String(latestMeas?.shouldersCm ?? ""));
  const [mNeck, setMNeck] = useState(String(latestMeas?.neckCm ?? ""));
  const [mThigh, setMThigh] = useState(String(latestMeas?.thighCm ?? ""));
  const [mArm, setMArm] = useState(String(latestMeas?.armCm ?? ""));
  const [mCalf, setMCalf] = useState(String(latestMeas?.calfCm ?? ""));
  const [mNote, setMNote] = useState("");

  const [chartMode, setChartMode] = useState<"cm" | "base100">("cm");
  const [activeSites, setActiveSites] = useState<MeasurementSiteKey[]>([
    "waistCm",
    "hipsCm",
    "chestCm",
    "thighCm",
  ]);

  const bodyComp = useMemo(
    () => computeBodyComposition({ profile, measurements, weights }),
    [profile, measurements, weights]
  );

  const base100Series = useMemo(
    () => buildNormalizedBase100Series(measurements, profile),
    [measurements, profile]
  );

  function handleAddMeasurement(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => {
      const parsed = Number(v.replace(",", "."));
      return Number.isFinite(parsed) && parsed > 0 ? +parsed.toFixed(1) : undefined;
    };
    const entry: BodyMeasurementEntry = {
      id: `bm-${Date.now()}`,
      dateKey: mDate || todayDateKey,
      createdAt: new Date().toISOString(),
      weightKg: num(mWeight),
      waistCm: num(mWaist),
      hipsCm: num(mHips),
      chestCm: num(mChest),
      shouldersCm: num(mShoulders),
      neckCm: num(mNeck),
      thighCm: num(mThigh),
      armCm: num(mArm),
      calfCm: num(mCalf),
      note: mNote.trim() || undefined,
    };
    onSaveMeasurement(entry);
    setMNote("");
  }

  // ---------------- 2. BILAN SANGUIN ----------------
  const sortedPanels = useMemo(
    () => [...bloodPanels].sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [bloodPanels]
  );
  const [selectedPanelId, setSelectedPanelId] = useState<string>(sortedPanels[0]?.id ?? "");
  const activePanel =
    sortedPanels.find((p) => p.id === selectedPanelId) ?? sortedPanels[0] ?? null;
  const previousPanel =
    sortedPanels.length > 1
      ? sortedPanels.find((p) => p.id !== activePanel?.id && p.dateKey <= (activePanel?.dateKey ?? "")) ??
        sortedPanels[1]
      : null;

  const [bloodDate, setBloodDate] = useState(todayDateKey);
  const [labName, setLabName] = useState("");
  const [fasting, setFasting] = useState(true);
  const [pregnant, setPregnant] = useState(false);
  const [bloodRawText, setBloodRawText] = useState("");
  const [bloodPhotoUrl, setBloodPhotoUrl] = useState<string | undefined>();
  const [bloodValues, setBloodValues] = useState<Partial<Record<BloodBiomarkerKey, string>>>({});
  const [bloodUnits, setBloodUnits] = useState<Partial<Record<BloodBiomarkerKey, string>>>({});
  const [bloodBusy, setBloodBusy] = useState(false);
  const [bloodError, setBloodError] = useState<string | null>(null);
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const bloodFileRef = useRef<HTMLInputElement>(null);

  async function handleAnalyzeBlood(e: React.FormEvent) {
    e.preventDefault();
    setBloodError(null);
    const manualMarkers: BloodMarkerInput[] = [];
    for (const k of QUICK_BLOOD_KEYS) {
      const raw = bloodValues[k];
      if (!raw || !raw.trim()) continue;
      const val = Number(raw.replace(",", "."));
      if (Number.isFinite(val) && val > 0) {
        manualMarkers.push({
          key: k,
          rawValue: val,
          unit: bloodUnits[k] || BIOMARKER_CATALOG[k].canonicalUnit,
        });
      }
    }

    if (manualMarkers.length === 0 && !bloodRawText.trim() && !bloodPhotoUrl) {
      setBloodError("Saisissez au moins 1 biomarqueur, collez le texte du labo ou importez une photo.");
      return;
    }

    setBloodBusy(true);
    try {
      const res = await fetch("/api/analyze-blood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: bloodPhotoUrl,
          rawText: bloodRawText,
          markers: manualMarkers,
          context: { fasting, pregnant, labName: labName.trim() || undefined },
          profile: { age: profile.age, sex: profile.sex },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erreur d'analyse biologique");
      }
      const saved: BloodPanelEntry = {
        id: `bp-${Date.now()}`,
        dateKey: bloodDate || todayDateKey,
        createdAt: new Date().toISOString(),
        context: { fasting, pregnant, labName: labName.trim() || undefined },
        markers: json.markers,
        analysis: json.analysis,
      };
      onSaveBloodPanel(saved);
      setSelectedPanelId(saved.id);
      setBloodRawText("");
      setBloodPhotoUrl(undefined);
      setBloodValues({});
    } catch (err) {
      setBloodError(err instanceof Error ? err.message : "Analyse impossible");
    } finally {
      setBloodBusy(false);
    }
  }

  // ---------------- 3. PHOTOS CORPS AVANT / APRÈS ----------------
  const [angleFilter, setAngleFilter] = useState<BodyPhotoAngle>("front");
  const filteredPhotos = useMemo(
    () =>
      [...bodyPhotoMetas]
        .filter((p) => p.angle === angleFilter)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [bodyPhotoMetas, angleFilter]
  );

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [discreteBlur, setDiscreteBlur] = useState(false);
  const [autoBlurFace, setAutoBlurFace] = useState(true);
  const [showGhostOverlay, setShowGhostOverlay] = useState(false);
  const [compareMode, setCompareMode] = useState<"slider" | "side_by_side">("slider");
  const [splitPct, setSplitPct] = useState(50);
  const [beforeId, setBeforeId] = useState<string>("");
  const [afterId, setAfterId] = useState<string>("");
  const [newPhotoAngle, setNewPhotoAngle] = useState<BodyPhotoAngle>("front");
  const [newPhotoDate, setNewPhotoDate] = useState(todayDateKey);
  const [newPhotoNote, setNewPhotoNote] = useState("");
  const [playingTimelapse, setPlayingTimelapse] = useState(false);
  const [timelapseIdx, setTimelapseIdx] = useState(0);
  const bodyPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subTab !== "photos") return;
    let active = true;
    async function hydrate() {
      const entries: [string, string][] = [];
      for (const meta of bodyPhotoMetas) {
        const url = await loadBodyPhotoDataUrl(meta.id);
        if (url) entries.push([meta.id, url]);
      }
      if (active) {
        setPhotoUrls(Object.fromEntries(entries));
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, [subTab, bodyPhotoMetas]);

  useEffect(() => {
    if (filteredPhotos.length >= 1 && (!beforeId || !filteredPhotos.some((p) => p.id === beforeId))) {
      setBeforeId(filteredPhotos[0].id);
    }
    if (filteredPhotos.length >= 1 && (!afterId || !filteredPhotos.some((p) => p.id === afterId))) {
      setAfterId(filteredPhotos[filteredPhotos.length - 1].id);
    }
  }, [filteredPhotos, beforeId, afterId]);

  useEffect(() => {
    if (!playingTimelapse || filteredPhotos.length < 2) return;
    const id = setInterval(() => {
      setTimelapseIdx((idx) => (idx + 1) % filteredPhotos.length);
    }, 1100);
    return () => clearInterval(id);
  }, [playingTimelapse, filteredPhotos.length]);

  async function handleUploadBodyPhoto(file: File) {
    const processed = await processBodyProgressPhoto(file, { blurFace: autoBlurFace });
    const id = `body-pic-${Date.now()}`;
    await saveBodyPhotoDataUrl(id, processed);
    const meta: BodyPhotoMeta = {
      id,
      dateKey: newPhotoDate || todayDateKey,
      createdAt: new Date().toISOString(),
      angle: newPhotoAngle,
      weightKg: latestMeas?.weightKg ?? profile.weightKg,
      waistCm: latestMeas?.waistCm ?? profile.waistCm,
      bodyFatPct: bodyComp.navyBodyFatPct ?? bodyComp.rfmPct,
      faceBlurred: autoBlurFace,
      note: newPhotoNote.trim() || undefined,
    };
    setPhotoUrls((prev) => ({ ...prev, [id]: processed }));
    onSaveBodyPhotoMeta(meta);
    setAngleFilter(newPhotoAngle);
    setAfterId(id);
    setNewPhotoNote("");
    setPhotoSheetOpen(false);
  }

  async function handleRemoveBodyPhoto(id: string) {
    await deleteBodyPhotoDataUrl(id);
    onDeleteBodyPhotoMeta(id);
  }

  const beforeMeta = filteredPhotos.find((p) => p.id === beforeId) ?? filteredPhotos[0];
  const afterMeta = filteredPhotos.find((p) => p.id === afterId) ?? filteredPhotos[filteredPhotos.length - 1];

  return (
    <div className="space-y-5">
      {/* Header Navigation Corps & Bilans */}
      <div className="vp-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Ruler className="w-5 h-5 text-emerald-400" />
            Corps, Mensurations, Bilan Sanguin &amp; Photos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mesurez la vraie transformation au-delà du poids brut : centimètres, composition US Navy/RFM, biologie médicale et comparateur Avant/Après 100 % privé.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {[
            { id: "measurements" as const, label: "Mensurations & Graph", icon: Ruler },
            { id: "blood" as const, label: "Bilan Sanguin", icon: Droplet },
            { id: "photos" as const, label: "Photos Avant/Après", icon: Camera },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  active ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SOUS-ONGLET 1 : MENSURATIONS, TABLEAU & GRAPHIQUE         */}
      {/* ========================================================= */}
      {subTab === "measurements" && (
        <div className="space-y-5">
          {bodyComp.recompositionBannerFr && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs text-emerald-100">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-300 block mb-0.5">Détecteur de Recomposition Corporelle</strong>
                {bodyComp.recompositionBannerFr}
              </div>
            </div>
          )}

          {/* KPI Composition Corporelle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="vp-card p-4">
              <span className="text-xs text-slate-400">
                % Masse grasse croisée <InfoTip term="us_navy_bf" />
              </span>
              <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                {bodyComp.bodyFatRangeMinPct}–{bodyComp.bodyFatRangeMaxPct}%
              </div>
              <span className="text-[11px] text-emerald-300">
                {bodyComp.navyBodyFatPct !== null
                  ? `US Navy ${bodyComp.navyBodyFatPct}% · RFM ${bodyComp.rfmPct}%`
                  : `RFM ${bodyComp.rfmPct}% (ajoutez cou + taille pour Navy)`}
              </span>
            </div>

            <div className="vp-card p-4">
              <span className="text-xs text-slate-400">Masse maigre / Masse grasse</span>
              <div className="text-2xl font-bold text-sky-300 mt-1 tabular-nums">
                {bodyComp.leanMassKg} kg <span className="text-sm text-slate-400">/ {bodyComp.fatMassKg} kg</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Indice FFMI : {bodyComp.ffmi} kg/m² <InfoTip term="ffmi" />
              </span>
            </div>

            <div className="vp-card p-4">
              <span className="text-xs text-slate-400">
                Ratio Taille / Hanches (WHR OMS) <InfoTip term="whr" />
              </span>
              <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                {bodyComp.whr ?? "—"}
              </div>
              <span className="text-[11px] text-slate-300">
                {bodyComp.whrStatusFr ?? "Saisissez taille et hanches"}
              </span>
            </div>

            <div className="vp-card p-4">
              <span className="text-xs text-slate-400">Évolution cumulée des cm</span>
              <div
                className={`text-2xl font-bold mt-1 tabular-nums ${
                  bodyComp.totalCmLostFromStart >= 0 ? "text-emerald-400" : "text-amber-300"
                }`}
              >
                {bodyComp.totalCmLostFromStart >= 0
                  ? `-${bodyComp.totalCmLostFromStart}`
                  : `+${Math.abs(bodyComp.totalCmLostFromStart)}`}{" "}
                cm
              </div>
              <span className="text-[11px] text-slate-400">
                Sur toutes les zones mesurées depuis le départ
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Courbe multi-sites &amp; Base 100 puis tableau chronologique détaillé
            </p>
            <button
              type="button"
              onClick={() => setMeasSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950"
            >
              <Plus className="w-4 h-4" />
              Nouveau relevé (cm)
            </button>
          </div>

          <DetailSheet
            open={measSheetOpen}
            onClose={() => setMeasSheetOpen(false)}
            title="Nouveau relevé de mensurations"
            subtitle="À mesurer le matin à jeun"
            size="md"
          >
            <form
              onSubmit={(e) => {
                handleAddMeasurement(e);
                setMeasSheetOpen(false);
              }}
              className="space-y-3"
            >

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-300">Date</span>
                  <input
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Poids (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={mWeight}
                    onChange={(e) => setMWeight(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-emerald-300 font-medium">Tour de taille (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="88.0"
                    value={mWaist}
                    onChange={(e) => setMWaist(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-emerald-500/40 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sky-300 font-medium">Hanches (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="99.5"
                    value={mHips}
                    onChange={(e) => setMHips(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Poitrine (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="101.5"
                    value={mChest}
                    onChange={(e) => setMChest(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-pink-300">Cou (cm · US Navy)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="38.8"
                    value={mNeck}
                    onChange={(e) => setMNeck(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Épaules (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="117.5"
                    value={mShoulders}
                    onChange={(e) => setMShoulders(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Cuisse (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="58.0"
                    value={mThigh}
                    onChange={(e) => setMThigh(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Bras (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="35.0"
                    value={mArm}
                    onChange={(e) => setMArm(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Mollet (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="38.2"
                    value={mCalf}
                    onChange={(e) => setMCalf(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
              </div>

              <input
                type="text"
                value={mNote}
                onChange={(e) => setMNote(e.target.value)}
                placeholder="Note optionnelle (ex. ruban pris au nombril, 2e mesure confirmée)"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Enregistrer ces mensurations
              </button>
            </form>
          </DetailSheet>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Graphique d'évolution SVG multi-séries */}
            <div className="vp-card p-4 sm:p-5 lg:col-span-12 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">Graphique d&apos;évolution corporelle</h3>
                  <p className="text-[11px] text-slate-400">
                    Basculez entre les centimètres réels et la vue normalisée Base 100 (Poids vs Taille vs % Gras) <InfoTip term="base100_chart" />
                  </p>
                </div>
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMode("cm")}
                    className={`px-2.5 py-1 rounded font-medium ${
                      chartMode === "cm" ? "bg-emerald-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    Vue en cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode("base100")}
                    className={`px-2.5 py-1 rounded font-medium ${
                      chartMode === "base100" ? "bg-sky-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    Base 100 (Poids / Taille / %)
                  </button>
                </div>
              </div>

              {chartMode === "cm" && (
                <div className="flex flex-wrap gap-1.5">
                  {MEASUREMENT_SITE_META.map((site) => {
                    const active = activeSites.includes(site.key);
                    return (
                      <button
                        key={site.key}
                        type="button"
                        onClick={() =>
                          setActiveSites((prev) =>
                            prev.includes(site.key)
                              ? prev.length > 1
                                ? prev.filter((k) => k !== site.key)
                                : prev
                              : [...prev, site.key]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition ${
                          active
                            ? "bg-slate-800 border-slate-600 text-white"
                            : "bg-slate-900/50 border-slate-800 text-slate-500"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: site.color }} />
                        {site.shortLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {sortedMeas.length < 2 ? (
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-8 text-center text-xs text-slate-400">
                  Ajoutez au moins 2 relevés de mensurations à des dates différentes pour tracer les courbes comparatives.
                </div>
              ) : chartMode === "cm" ? (
                <div className="w-full overflow-x-auto">
                  {(() => {
                    const W = 680;
                    const H = 250;
                    const PL = 46;
                    const PR = 16;
                    const PT = 16;
                    const PB = 34;
                    const allVals: number[] = [];
                    for (const row of sortedMeas) {
                      for (const sk of activeSites) {
                        const v = row[sk];
                        if (typeof v === "number") allVals.push(v);
                      }
                    }
                    const minV = allVals.length ? Math.floor(Math.min(...allVals) - 2) : 30;
                    const maxV = allVals.length ? Math.ceil(Math.max(...allVals) + 2) : 120;
                    const span = Math.max(4, maxV - minV);
                    const xAt = (i: number) =>
                      PL + (i / Math.max(1, sortedMeas.length - 1)) * (W - PL - PR);
                    const yAt = (v: number) => PT + (1 - (v - minV) / span) * (H - PT - PB);

                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[460px] h-auto">
                        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                          const v = +(minV + t * span).toFixed(0);
                          const y = yAt(v);
                          return (
                            <g key={t}>
                              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                              <text x={PL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                                {v} cm
                              </text>
                            </g>
                          );
                        })}

                        {activeSites.map((sk) => {
                          const meta = MEASUREMENT_SITE_META.find((m) => m.key === sk)!;
                          const pts = sortedMeas
                            .map((row, idx) => {
                              const val = row[sk];
                              return typeof val === "number"
                                ? { x: xAt(idx), y: yAt(val), val, date: row.dateKey }
                                : null;
                            })
                            .filter((p): p is NonNullable<typeof p> => p !== null);
                          if (pts.length === 0) return null;
                          return (
                            <g key={sk}>
                              {pts.length >= 2 && (
                                <polyline
                                  fill="none"
                                  stroke={meta.color}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                                />
                              )}
                              {pts.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4" fill={meta.color} stroke="#0B1215" strokeWidth="1.5">
                                  <title>{`${meta.label} (${p.date}) : ${p.val} cm`}</title>
                                </circle>
                              ))}
                            </g>
                          );
                        })}

                        {sortedMeas.map((row, idx) => (
                          <text
                            key={row.id}
                            x={xAt(idx)}
                            y={H - 10}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#94a3b8"
                          >
                            {row.dateKey.slice(5)}
                          </text>
                        ))}
                      </svg>
                    );
                  })()}
                </div>
              ) : (
                <div className="w-full overflow-x-auto space-y-2">
                  {(() => {
                    const W = 680;
                    const H = 240;
                    const PL = 46;
                    const PR = 16;
                    const PT = 16;
                    const PB = 34;
                    const vals = base100Series.flatMap((p) =>
                      [p.weightIdx, p.waistIdx, p.bodyFatIdx].filter((x): x is number => x !== null)
                    );
                    const minV = vals.length ? Math.floor(Math.min(...vals, 96) - 1) : 85;
                    const maxV = vals.length ? Math.ceil(Math.max(...vals, 102) + 1) : 105;
                    const span = Math.max(4, maxV - minV);
                    const xAt = (i: number) =>
                      PL + (i / Math.max(1, base100Series.length - 1)) * (W - PL - PR);
                    const yAt = (v: number) => PT + (1 - (v - minV) / span) * (H - PT - PB);

                    const lines = [
                      { key: "weightIdx" as const, label: "Poids (Base 100)", color: "#38BDF8" },
                      { key: "waistIdx" as const, label: "Tour de taille (Base 100)", color: "#34D399" },
                      { key: "bodyFatIdx" as const, label: "% Masse grasse (Base 100)", color: "#FBBF24" },
                    ];

                    return (
                      <>
                        <div className="flex flex-wrap gap-4 text-[11px] text-slate-300">
                          {lines.map((l) => (
                            <span key={l.key} className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.label}
                            </span>
                          ))}
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[460px] h-auto">
                          <line x1={PL} y1={yAt(100)} x2={W - PR} y2={yAt(100)} stroke="#475569" strokeDasharray="4 4" />
                          <text x={PL - 6} y={yAt(100) + 3} textAnchor="end" fontSize="10" fill="#cbd5e1">
                            100
                          </text>
                          {lines.map((l) => {
                            const pts = base100Series
                              .map((p, idx) => {
                                const v = p[l.key];
                                return v !== null ? { x: xAt(idx), y: yAt(v), v, date: p.dateKey } : null;
                              })
                              .filter((x): x is NonNullable<typeof x> => x !== null);
                            if (pts.length === 0) return null;
                            return (
                              <g key={l.key}>
                                {pts.length >= 2 && (
                                  <polyline
                                    fill="none"
                                    stroke={l.color}
                                    strokeWidth="2.5"
                                    points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                                  />
                                )}
                                {pts.map((p, i) => (
                                  <circle key={i} cx={p.x} cy={p.y} r="4" fill={l.color} />
                                ))}
                              </g>
                            );
                          })}
                          {base100Series.map((p, idx) => (
                            <text key={p.dateKey} x={xAt(idx)} y={H - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
                              {p.dateKey.slice(5)}
                            </text>
                          ))}
                        </svg>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Beau Tableau Comparatif des Mensurations */}
          <div className="vp-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">Tableau comparatif des mensurations</h3>
              <span className="text-[11px] text-slate-400">
                Un écart inférieur à ±1 cm peut correspondre au bruit normal du ruban — observez la tendance sur 2–4 semaines.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 pr-3 font-medium">Zone corporelle</th>
                    <th className="py-2.5 px-3 font-medium">Départ ({firstMeas?.dateKey.slice(5) ?? "—"})</th>
                    <th className="py-2.5 px-3 font-medium">Actuel ({latestMeas?.dateKey.slice(5) ?? "—"})</th>
                    <th className="py-2.5 px-3 font-medium">Variation Δ</th>
                    <th className="py-2.5 px-3 font-medium">Évolution %</th>
                    <th className="py-2.5 pl-3 font-medium">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {MEASUREMENT_SITE_META.map((site) => {
                    const series = sortedMeas
                      .map((m) => m[site.key])
                      .filter((v): v is number => typeof v === "number");
                    const start = series[0];
                    const curr = series[series.length - 1];
                    const delta = start !== undefined && curr !== undefined ? +(curr - start).toFixed(1) : null;
                    const pct = delta !== null && start ? +((delta / start) * 100).toFixed(1) : null;

                    return (
                      <tr key={site.key} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2 font-medium text-white">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: site.color }} />
                            <span>{site.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block pl-4">{site.protocolTip}</span>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-300">
                          {start !== undefined ? `${start} cm` : "—"}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums font-semibold text-white">
                          {curr !== undefined ? `${curr} cm` : "—"}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">
                          {delta === null ? (
                            "—"
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                delta <= -1
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : delta >= 1
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta} cm
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-300">
                          {pct !== null ? `${pct > 0 ? `+${pct}` : pct} %` : "—"}
                        </td>
                        <td className="py-2.5 pl-3">
                          <MiniSparkline values={series} color={site.color} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedMeas.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Historique enregistré ({sortedMeas.length} relevé{sortedMeas.length > 1 ? "s" : ""})
                </span>
                <div className="flex flex-wrap gap-2">
                  {[...sortedMeas].reverse().map((row) => (
                    <div
                      key={row.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-white">{row.dateKey}</span>
                      <span className="text-slate-400">
                        {row.weightKg ? `${row.weightKg} kg · ` : ""}
                        {row.waistCm ? `Taille ${row.waistCm} cm` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteMeasurement(row.id)}
                        title="Supprimer ce relevé"
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SOUS-ONGLET 2 : ANALYSEUR DE BILAN SANGUIN                */}
      {/* ========================================================= */}
      {subTab === "blood" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3.5 text-xs text-sky-100">
            <strong>Cadre médical transparent :</strong> cet analyseur vulgarise vos marqueurs à partir des référentiels officiels (<strong>HAS</strong>, <strong>ESC/EAS</strong>, <strong>ADA</strong>, <strong>KDIGO 2024</strong>, <strong>OMS</strong>) avec conversion automatique des unités françaises (<code>g/L</code> ↔ <code>mmol/L</code>, <code>mg/L</code> ↔ <code>µmol/L</code>). Il ne remplace jamais l&apos;avis de votre médecin.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Unités FR &amp; SI converties automatiquement · Calcul HOMA-IR, CKD-EPI 2021 &amp; FIB-4
            </p>
            <button
              type="button"
              onClick={() => setBloodSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950"
            >
              <Plus className="w-4 h-4" />
              Analyser un nouveau bilan
            </button>
          </div>

          <DetailSheet
            open={bloodSheetOpen}
            onClose={() => setBloodSheetOpen(false)}
            title="Analyser un bilan sanguin"
            subtitle="Conversion FR / SI auto · photo ou collage PDF labo"
            size="lg"
          >
            <form
              onSubmit={async (e) => {
                await handleAnalyzeBlood(e);
                setBloodSheetOpen(false);
              }}
              className="space-y-4"
            >

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-300">Date du bilan</span>
                  <input
                    type="date"
                    value={bloodDate}
                    onChange={(e) => setBloodDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Laboratoire (optionnel)</span>
                  <input
                    type="text"
                    placeholder="Biogroup, Cerballiance…"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fasting}
                    onChange={(e) => setFasting(e.target.checked)}
                    className="rounded border-slate-600 accent-emerald-500"
                  />
                  À jeun (8–12 h)
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pregnant}
                    onChange={(e) => setPregnant(e.target.checked)}
                    className="rounded border-slate-600 accent-amber-400"
                  />
                  Grossesse en cours
                </label>
              </div>

              {/* Zone Import photo / collage texte labo */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    Import rapide texte PDF ou photo labo
                  </span>
                  <input
                    ref={bloodFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      const url = await processBodyProgressPhoto(f, { blurFace: false, maxDim: 1400 });
                      setBloodPhotoUrl(url);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bloodFileRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-sky-300 font-medium"
                  >
                    {bloodPhotoUrl ? "Photo chargée ✓" : "+ Photo bilan"}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={bloodRawText}
                  onChange={(e) => setBloodRawText(e.target.value)}
                  placeholder="Collez ici les lignes de votre PDF labo (ex: Glycémie 0,92 g/L · HbA1c 5,4 % · LDL 1,12 g/L · Triglycérides 1,18 g/L · Créatinine 8,8 mg/L · ALAT 24 UI/L)…"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>

              {/* Champs structurés rapides */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {QUICK_BLOOD_KEYS.map((key) => {
                  const def = BIOMARKER_CATALOG[key];
                  const tipId = resolveBloodGlossaryId(key);
                  return (
                    <div key={key} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <span className="col-span-6 flex items-center gap-1 text-slate-300" title={def.labelFr}>
                        <span className="truncate">{def.labelFr}</span>
                        {tipId && <InfoTip term={tipId} />}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Valeur"
                        value={bloodValues[key] ?? ""}
                        onChange={(e) =>
                          setBloodValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="col-span-3 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-white tabular-nums"
                      />
                      <select
                        value={bloodUnits[key] ?? def.canonicalUnit}
                        onChange={(e) =>
                          setBloodUnits((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="col-span-3 rounded-lg bg-slate-900 border border-slate-700 px-1.5 py-1.5 text-slate-200"
                      >
                        {def.supportedUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {bloodError && (
                <p className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg p-2.5">
                  {bloodError}
                </p>
              )}

              <button
                type="submit"
                disabled={bloodBusy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition"
              >
                <Activity className="w-4 h-4" />
                {bloodBusy ? "Analyse médicale en cours..." : "Analyser mon bilan sanguin"}
              </button>
            </form>
          </DetailSheet>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Résultats & Comparaison Longitudinale */}
            <div className="lg:col-span-12 space-y-4">
              {sortedPanels.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Bilans enregistrés :</span>
                  {sortedPanels.map((panel) => (
                    <div
                      key={panel.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border ${
                        activePanel?.id === panel.id
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200 font-semibold"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPanelId(panel.id)}
                        className="inline-flex items-center gap-1.5 text-left"
                      >
                        <span>{panel.dateKey}</span>
                        {panel.context.labName && (
                          <span className="text-[10px] opacity-75">· {panel.context.labName}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBloodPanel(panel.id)}
                        className="text-slate-400 hover:text-rose-400 ml-1"
                        title="Supprimer ce bilan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!activePanel ? (
                <div className="vp-card p-8 text-center text-sm text-slate-400">
                  Aucun bilan enregistré pour l&apos;instant. Saisissez vos résultats ou collez votre PDF de laboratoire à gauche.
                </div>
              ) : (
                <>
                  {activePanel.analysis.criticalFlags.length > 0 && (
                    <div className="rounded-2xl border border-rose-500/60 bg-rose-500/15 p-4 space-y-1.5">
                      <h4 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-400" />
                        Points nécessitant un avis médical rapide
                      </h4>
                      <ul className="list-disc pl-5 text-xs text-rose-100 space-y-1">
                        {activePanel.analysis.criticalFlags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Synthèse + Score */}
                  <div className="vp-card-accent p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                        Synthèse biologique · {activePanel.dateKey}
                      </span>
                      <p className="text-sm text-white font-medium">{activePanel.analysis.summaryFr}</p>
                      {activePanel.analysis.renalProteinGuardTriggered && (
                        <p className="text-xs text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-lg px-2.5 py-1.5 mt-2">
                          Garde-fou KDIGO (DFG &lt; 60) : validez vos cibles protéines (~0,8 g/kg/j) et potassium avec votre médecin.
                        </p>
                      )}
                    </div>
                    <div className="text-center px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Équilibre global</span>
                      <strong className="text-2xl font-bold text-emerald-400 tabular-nums">
                        {activePanel.analysis.overallScore}/100
                      </strong>
                    </div>
                  </div>

                  {/* Ratios calculés */}
                  {activePanel.analysis.derivedMetrics.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activePanel.analysis.derivedMetrics.map((dm) => {
                        const dmTip = resolveBloodGlossaryId(dm.id);
                        return (
                          <div key={dm.id} className="vp-card p-3.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white">
                                {dm.labelFr}
                                {dmTip && <InfoTip term={dmTip} />}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(dm.status)}`}
                              >
                                {dm.value} {dm.unit}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{dm.interpretationFr}</p>
                            <span className="text-[10px] text-slate-500 block">{dm.sourceRef}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Détail marqueurs + comparaison avec bilan précédent */}
                  <div className="vp-card p-4 sm:p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-white">
                      Détail des marqueurs {previousPanel ? `(comparés au ${previousPanel.dateKey})` : ""}
                    </h4>
                    <div className="space-y-2.5">
                      {activePanel.analysis.evaluatedMarkers.map((ev) => {
                        const prevMatch = previousPanel?.analysis.evaluatedMarkers.find(
                          (pm) => pm.key === ev.key
                        );
                        const deltaPct =
                          prevMatch && prevMatch.canonicalValue > 0
                            ? +(((ev.canonicalValue - prevMatch.canonicalValue) / prevMatch.canonicalValue) * 100).toFixed(1)
                            : null;

                        const markerTip = resolveBloodGlossaryId(ev.key);

                        return (
                          <div key={ev.key} className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs sm:text-sm text-white">
                                  {ev.labelFr}
                                  {markerTip && <InfoTip term={markerTip} />}
                                </strong>
                                <span className="text-xs font-bold text-emerald-300 tabular-nums">
                                  {ev.canonicalValue} {ev.canonicalUnit}
                                </span>
                                {deltaPct !== null && (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 tabular-nums">
                                    {deltaPct > 0 ? `+${deltaPct}` : deltaPct}% vs préc.
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ev.status)}`}>
                                {statusLabelFr(ev.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">{ev.explanationFr}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                              <div className="rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-emerald-200/90">
                                <strong>Nutrition Ciqual :</strong> {ev.nutritionActionFr}
                              </div>
                              <div className="rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-sky-200/90">
                                <strong>Activité :</strong> {ev.exerciseActionFr}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>Norme : {ev.refRangeLabel} · Optimal : {ev.optimalRangeLabel}</span>
                              <span>{ev.sourceRef}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Questions pour le médecin */}
                  <div className="vp-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">Questions utiles à poser à votre médecin</h4>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(activePanel.analysis.doctorQuestions.join("\n"));
                          setCopiedQuestions(true);
                          setTimeout(() => setCopiedQuestions(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-200"
                      >
                        {copiedQuestions ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedQuestions ? "Copié" : "Copier"}
                      </button>
                    </div>
                    <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                      {activePanel.analysis.doctorQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SOUS-ONGLET 3 : PHOTOS D'ÉVOLUTION AVANT / APRÈS PRIVÉES  */}
      {/* ========================================================= */}
      {subTab === "photos" && (
        <div className="space-y-5">
          {/* Bandeau Confidentialité Locale */}
          <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-emerald-100">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Coffre photo 100 % local (IndexedDB sur votre appareil)</strong> — vos photos corporelles ne sont <strong>jamais</strong> envoyées sur un serveur, leurs métadonnées EXIF/GPS sont purgées automatiquement, et vous pouvez flouter le visage d&apos;un clic.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPhotoSheetOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une photo
              </button>
              <button
                type="button"
                onClick={() => setDiscreteBlur((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  discreteBlur
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-900 text-slate-200 border-slate-700"
                }`}
              >
                {discreteBlur ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {discreteBlur ? "Désactiver mode discret" : "Mode discret (flouter)"}
              </button>
            </div>
          </div>

          <DetailSheet
            open={photoSheetOpen}
            onClose={() => setPhotoSheetOpen(false)}
            title="Ajouter une photo d'évolution"
            subtitle="Stockée uniquement localement sur cet appareil"
            size="md"
          >
            {/* Ajout nouvelle photo */}
            <div className="space-y-3">

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-300">Date</span>
                  <input
                    type="date"
                    value={newPhotoDate}
                    onChange={(e) => setNewPhotoDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Pose</span>
                  <select
                    value={newPhotoAngle}
                    onChange={(e) => setNewPhotoAngle(e.target.value as BodyPhotoAngle)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-white"
                  >
                    <option value="front">Face</option>
                    <option value="side">Profil</option>
                    <option value="back">Dos</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBlurFace}
                  onChange={(e) => setAutoBlurFace(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Flouter automatiquement le haut (visage) avant stockage
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGhostOverlay}
                  onChange={(e) => setShowGhostOverlay(e.target.checked)}
                  className="rounded accent-sky-400"
                />
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Afficher repère Ghost de la photo 1 (alignement)
                </span>
              </label>

              <input
                type="text"
                value={newPhotoNote}
                onChange={(e) => setNewPhotoNote(e.target.value)}
                placeholder="Note (ex. à jeun le matin, semaine 8)"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />

              <input
                ref={bodyPhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) void handleUploadBodyPhoto(f);
                }}
              />
              <button
                type="button"
                onClick={() => bodyPhotoInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
              >
                <Camera className="w-4 h-4" />
                Prendre / Importer une photo
              </button>

              {showGhostOverlay && beforeMeta && photoUrls[beforeMeta.id] && (
                <div className="rounded-xl border border-sky-400/40 bg-slate-950 p-2 space-y-1">
                  <span className="text-[10px] text-sky-300 block">
                    Repère d&apos;alignement (calque 30 % de {beforeMeta.dateKey}) :
                  </span>
                  <img
                    src={photoUrls[beforeMeta.id]}
                    alt="Calque fantôme"
                    className={`w-full h-44 object-contain opacity-35 rounded ${discreteBlur ? "blur-lg" : ""}`}
                  />
                </div>
              )}
            </div>
          </DetailSheet>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Comparateur Interactif Avant / Après */}
            <div className="vp-card p-4 sm:p-5 lg:col-span-12 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  {(["front", "side", "back"] as BodyPhotoAngle[]).map((ang) => (
                    <button
                      key={ang}
                      type="button"
                      onClick={() => setAngleFilter(ang)}
                      className={`px-3 py-1 rounded font-medium ${
                        angleFilter === ang ? "bg-emerald-500 text-slate-950" : "text-slate-300"
                      }`}
                    >
                      {ANGLE_LABELS[ang]}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayingTimelapse(false);
                      setCompareMode("slider");
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                      compareMode === "slider" && !playingTimelapse
                        ? "bg-sky-500 text-slate-950 border-sky-400 font-semibold"
                        : "bg-slate-900 text-slate-300 border-slate-700"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Curseur Avant/Après
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayingTimelapse(false);
                      setCompareMode("side_by_side");
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                      compareMode === "side_by_side" && !playingTimelapse
                        ? "bg-sky-500 text-slate-950 border-sky-400 font-semibold"
                        : "bg-slate-900 text-slate-300 border-slate-700"
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    Côte à côte
                  </button>
                  {filteredPhotos.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setPlayingTimelapse((p) => !p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-emerald-300 border border-emerald-500/40 font-semibold"
                    >
                      {playingTimelapse ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {playingTimelapse ? "Stop" : "Timelapse"}
                    </button>
                  )}
                </div>
              </div>

              {filteredPhotos.length === 0 ? (
                <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-8 text-center text-xs text-slate-400">
                  Aucune photo en vue {ANGLE_LABELS[angleFilter]}. Ajoutez votre première photo à gauche (tout reste stocké uniquement dans votre navigateur/téléphone).
                </div>
              ) : playingTimelapse ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center p-3">
                  {filteredPhotos[timelapseIdx] && photoUrls[filteredPhotos[timelapseIdx].id] && (
                    <img
                      src={photoUrls[filteredPhotos[timelapseIdx].id]}
                      alt="Timelapse"
                      className={`max-h-[400px] w-auto object-contain rounded-xl ${discreteBlur ? "blur-xl" : ""}`}
                    />
                  )}
                  <div className="mt-2 text-xs text-emerald-300 font-semibold">
                    {filteredPhotos[timelapseIdx]?.dateKey} ·{" "}
                    {filteredPhotos[timelapseIdx]?.weightKg ?? "—"} kg ·{" "}
                    {filteredPhotos[timelapseIdx]?.waistCm ?? "—"} cm
                  </div>
                </div>
              ) : compareMode === "slider" && beforeMeta && afterMeta ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-amber-300 font-semibold">Avant :</span>
                      <select
                        value={beforeMeta.id}
                        onChange={(e) => setBeforeId(e.target.value)}
                        className="bg-transparent text-white flex-1 outline-none"
                      >
                        {filteredPhotos.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900">
                            {p.dateKey} ({p.weightKg ?? "—"} kg)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-300 font-semibold">Après :</span>
                      <select
                        value={afterMeta.id}
                        onChange={(e) => setAfterId(e.target.value)}
                        className="bg-transparent text-white flex-1 outline-none"
                      >
                        {filteredPhotos.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900">
                            {p.dateKey} ({p.weightKg ?? "—"} kg)
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Conteneur Split Slider */}
                  <div className="relative mx-auto max-w-md h-[420px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 select-none">
                    {photoUrls[afterMeta.id] && (
                      <img
                        src={photoUrls[afterMeta.id]}
                        alt={`Après ${afterMeta.dateKey}`}
                        className={`absolute inset-0 w-full h-full object-contain ${discreteBlur ? "blur-xl" : ""}`}
                      />
                    )}
                    {photoUrls[beforeMeta.id] && (
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
                      >
                        <img
                          src={photoUrls[beforeMeta.id]}
                          alt={`Avant ${beforeMeta.dateKey}`}
                          className={`w-full h-full object-contain ${discreteBlur ? "blur-xl" : ""}`}
                        />
                      </div>
                    )}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                      style={{ left: `${splitPct}%` }}
                    />
                    <span className="absolute top-2.5 left-2.5 text-[10px] px-2 py-1 rounded bg-black/75 text-amber-300 font-semibold">
                      AVANT · {beforeMeta.dateKey}
                    </span>
                    <span className="absolute top-2.5 right-2.5 text-[10px] px-2 py-1 rounded bg-black/75 text-emerald-300 font-semibold">
                      APRÈS · {afterMeta.dateKey}
                    </span>
                  </div>

                  <div className="max-w-md mx-auto space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitPct}
                      aria-label="Curseur comparateur Avant et Après"
                      onChange={(e) => setSplitPct(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-ew-resize"
                    />
                    {beforeMeta.weightKg && afterMeta.weightKg && (
                      <div className="text-center text-xs text-slate-300">
                        Écart entre les deux photos :{" "}
                        <strong className="text-emerald-300">
                          {(afterMeta.weightKg - beforeMeta.weightKg).toFixed(1)} kg
                        </strong>
                        {beforeMeta.waistCm && afterMeta.waistCm
                          ? ` · ${(afterMeta.waistCm - beforeMeta.waistCm).toFixed(1)} cm de taille`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[beforeMeta, afterMeta].filter(Boolean).map((p, idx) => (
                    <div key={p!.id + idx} className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 space-y-2">
                      {photoUrls[p!.id] && (
                        <img
                          src={photoUrls[p!.id]}
                          alt={p!.dateKey}
                          className={`w-full h-72 object-contain rounded-lg ${discreteBlur ? "blur-xl" : ""}`}
                        />
                      )}
                      <div className="text-xs flex justify-between text-slate-300">
                        <strong>{idx === 0 ? "Avant" : "Après"} · {p!.dateKey}</strong>
                        <span className="text-emerald-300">{p!.weightKg ?? "—"} kg · {p!.waistCm ?? "—"} cm</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vignettes chronologiques */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 block mb-2">
                  Galerie ({filteredPhotos.length} photo{filteredPhotos.length > 1 ? "s" : ""} · {ANGLE_LABELS[angleFilter]})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {filteredPhotos.map((p) => (
                    <div key={p.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden text-[11px]">
                      {photoUrls[p.id] && (
                        <img
                          src={photoUrls[p.id]}
                          alt={p.dateKey}
                          className={`w-full h-28 object-cover cursor-pointer ${discreteBlur ? "blur-md" : ""}`}
                          onClick={() => setAfterId(p.id)}
                        />
                      )}
                      <div className="p-2 flex items-center justify-between gap-1">
                        <div>
                          <strong className="text-white block">{p.dateKey}</strong>
                          <span className="text-slate-400">{p.weightKg ?? "—"} kg</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveBodyPhoto(p.id)}
                          className="text-slate-500 hover:text-rose-400"
                          title="Supprimer définitivement de l'appareil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
