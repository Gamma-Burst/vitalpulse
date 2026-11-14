"use client";

import React, { useState } from "react";
import {
  Award,
  Bell,
  BellRing,
  CheckCircle2,
  Info,
  PlusCircle,
  RotateCcw,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  ActivityProfile,
  AnthropometricReport,
  ChallengeMetric,
  CustomChallenge,
  DailyEnergyBalance,
  PrimaryGoal,
  Sex,
  SpecialMode,
  UserProfile,
} from "@/types/vitalpulse";
import { subscribeBrowserToPush } from "@/lib/native-bridge";
import { DetailSheet } from "@/components/ui/DetailSheet";

interface ProfileChallengesViewProps {
  profile: UserProfile;
  anthro: AnthropometricReport;
  todayBalance: DailyEnergyBalance;
  challenges: CustomChallenge[];
  onSaveProfile: (next: UserProfile) => void;
  onAddChallenge: (c: CustomChallenge) => void;
  onToggleChallengeToday: (challengeId: string) => void;
  onDeleteChallenge: (challengeId: string) => void;
  onStartFreshWithProfile: (next: UserProfile) => void;
  onResetDemo: () => void;
  onReopenOnboarding?: () => void;
}

export function ProfileChallengesView({
  profile,
  anthro,
  todayBalance,
  challenges,
  onSaveProfile,
  onAddChallenge,
  onToggleChallengeToday,
  onDeleteChallenge,
  onStartFreshWithProfile,
  onResetDemo,
  onReopenOnboarding,
}: ProfileChallengesViewProps) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [showSources, setShowSources] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [challengeSheetOpen, setChallengeSheetOpen] = useState(false);

  // Web Push
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Nouveau challenge personnalisé
  const [chTitle, setChTitle] = useState("");
  const [chDesc, setChDesc] = useState("");
  const [chMetric, setChMetric] = useState<ChallengeMetric>("steps");
  const [chTarget, setChTarget] = useState(8000);
  const [chUnit, setChUnit] = useState("pas");
  const [chDays, setChDays] = useState(14);
  const [chTime, setChTime] = useState("18:30");

  async function handleEnablePush() {
    try {
      const pkRes = await fetch("/api/push/public-key");
      const pkJson = await pkRes.json();
      if (!pkJson.publicKey) {
        setPushStatus("Clé VAPID publique absente.");
        return;
      }
      const sub = await subscribeBrowserToPush(pkJson.publicKey);
      setPushSubscription(sub);
      setPushStatus("Notifications Push activées sur cet appareil !");
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : "Activation Push impossible.");
    }
  }

  async function handleSendTestPush() {
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: pushSubscription?.toJSON?.(),
          title: "VitalPulse · Rappel Challenge",
          body: `Encore ${Math.max(0, form.dailyStepGoal - todayBalance.rawSteps)} pas ou 2 min d'exercice pour valider votre objectif du jour !`,
          url: "/",
        }),
      });
      const json = await res.json();
      if (json.sent > 0) {
        setPushStatus("Notification Push réelle envoyée avec succès via VAPID !");
      } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("VitalPulse · Rappel Challenge", {
          body: `Objectif du jour : ${todayBalance.rawSteps} / ${form.dailyStepGoal} pas.`,
          icon: "/icons/icon-192.png",
        });
        setPushStatus("Notification locale affichée sur cet appareil.");
      } else {
        setPushStatus(json.message || "Activez d'abord les notifications Push ci-dessus.");
      }
    } catch {
      setPushStatus("Impossible de joindre le service Push.");
    }
  }

  function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!chTitle.trim()) return;
    const item: CustomChallenge = {
      id: `chal-${Date.now()}`,
      title: chTitle.trim(),
      description: chDesc.trim() || `Objectif quotidien : ${chTarget} ${chUnit}`,
      metric: chMetric,
      targetValue: Math.max(1, chTarget),
      unit: chUnit || "unité",
      durationDays: Math.max(1, chDays),
      reminderTime: chTime,
      active: true,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    onAddChallenge(item);
    setChTitle("");
    setChDesc("");
    setChallengeSheetOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Vrai Bilan Corporel (IMC + WtHR + BRI + RFM + TDEE) */}
      <div className="vp-card-accent p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Vrai Bilan Corporel &amp; Métabolique
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ne vous fiez plus uniquement à l&apos;IMC brut : VitalPulse croise IMC OMS, Ratio Tour de taille / Taille, Body Roundness Index (JAMA 2024) et Masse Grasse Relative (RFM).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSources((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-sky-300"
          >
            <Info className="w-3.5 h-3.5" />
            {showSources ? "Masquer sources" : "Pourquoi ces calculs ?"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">IMC Officiel (OMS)</span>
            <p className="text-2xl font-bold text-white tabular-nums mt-0.5">{anthro.bmi}</p>
            <span className="text-[11px] text-emerald-300">{anthro.bmiCategoryFr}</span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">Ratio Taille / Hauteur (WtHR)</span>
            <p className="text-2xl font-bold text-sky-300 tabular-nums mt-0.5">
              {anthro.wthr !== null ? anthro.wthr : "—"}
            </p>
            <span className="text-[11px] text-slate-300">
              {anthro.wthrStatusFr ?? "Saisissez le tour de taille (seuil < 0,50)"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">Body Roundness Index (BRI)</span>
            <p className="text-2xl font-bold text-emerald-300 tabular-nums mt-0.5">
              {anthro.bri !== null ? anthro.bri : "—"}
            </p>
            <span className="text-[11px] text-slate-300">
              {anthro.briCategoryFr ?? "Optimal entre 3,4 et 5,4 (JAMA 2024)"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">Masse Grasse Estimée (RFM)</span>
            <p className="text-2xl font-bold text-amber-300 tabular-nums mt-0.5">
              {anthro.rfmPct} %
            </p>
            <span className="text-[11px] text-slate-400">{anthro.rfmMethodLabel}</span>
          </div>
        </div>

        {anthro.athleticCoherenceNote && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 p-3 text-xs text-emerald-100">
            <strong>Analyse croisée morphologique :</strong> {anthro.athleticCoherenceNote}
          </div>
        )}

        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Métabolisme de repos (BMR)</span>
            <strong className="text-white text-sm">{anthro.bmrKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Maintien estimé (TDEE)</span>
            <strong className="text-sky-300 text-sm">{anthro.estimatedMaintenanceKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Cible calorique journalière</span>
            <strong className="text-emerald-300 text-sm">{anthro.targetIntakeKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Protéines / Fibres cibles</span>
            <strong className="text-white text-sm">
              {anthro.targets.proteinG} g / {anthro.targets.fiberG} g
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Eau / Sodium max</span>
            <strong className="text-cyan-300 text-sm">
              {(anthro.targets.waterMl / 1000).toFixed(1)} L / {anthro.targets.sodiumMaxMg} mg
            </strong>
          </div>
        </div>

        {(anthro.safetyFloorApplied || anthro.minorSafetyLock) && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/35 p-3 text-xs text-amber-100">
            <strong>Garde-fou médical actif :</strong>{" "}
            {anthro.minorSafetyLock
              ? "Mode déficit désactivé automatiquement pour les moins de 18 ans."
              : "Plancher calorique minimal appliqué afin de préserver votre métabolisme et votre masse maigre."}
          </div>
        )}

        {showSources && (
          <div className="rounded-xl bg-slate-900 p-3.5 text-xs text-slate-300 space-y-1">
            <strong className="text-white">Référentiels scientifiques utilisés :</strong>
            <ul className="list-disc pl-4 space-y-1">
              {anthro.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Carte concise Profil + Drawer d'édition */}
      <div className="vp-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Profil : {profile.name} ({profile.age} ans · {profile.heightCm} cm · {profile.weightKg} kg)
            </h3>
            <p className="text-xs text-slate-400">
              Cible {profile.targetWeightKg} kg · {profile.dailyStepGoal} pas/j
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProfileSheetOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Modifier mes mesures / objectifs
            </button>
            {onReopenOnboarding && (
              <button
                type="button"
                onClick={onReopenOnboarding}
                className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-semibold hover:bg-amber-500/25"
              >
                Relancer le questionnaire d&apos;accueil
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartFreshWithProfile(form)}
              className="px-3 py-2 rounded-xl bg-sky-500/20 border border-sky-400/35 text-sky-200 text-xs font-medium hover:bg-sky-500/30"
            >
              Démarrer à zéro avec ce profil réel
            </button>
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
            >
              <RotateCcw className="w-3 h-3" /> Démo 7j
            </button>
          </div>
        </div>
        {profileSavedMsg && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-2.5 text-xs text-emerald-200">
            {profileSavedMsg}
          </div>
        )}
      </div>

      <DetailSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title="Paramètres biométriques & objectifs"
        subtitle="Calibrage instantané de votre IMC, BMR et macros"
        size="lg"
      >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-slate-400 block">Prénom / Profil</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Âge (ans)</span>
            <input
              type="number"
              min={12}
              max={105}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: Number(e.target.value) || 30 })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Sexe biologique (BMR/RFM)</span>
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Taille (cm)</span>
            <input
              type="number"
              min={120}
              max={230}
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) || 175 })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-400 block">Poids actuel (kg)</span>
            <input
              type="number"
              step="0.1"
              min={30}
              max={280}
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) || 75 })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Poids souhaité (kg)</span>
            <input
              type="number"
              step="0.1"
              min={35}
              max={250}
              value={form.targetWeightKg}
              onChange={(e) => setForm({ ...form, targetWeightKg: Number(e.target.value) || 70 })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Tour de taille au nombril (cm)</span>
            <input
              type="number"
              step="0.5"
              min={45}
              max={200}
              value={form.waistCm ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  waistCm: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="Optionnel mais recommandé"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Objectif de pas / jour</span>
            <input
              type="number"
              step={500}
              min={1500}
              max={30000}
              value={form.dailyStepGoal}
              onChange={(e) => setForm({ ...form, dailyStepGoal: Number(e.target.value) || 8000 })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-400 block">Activité hors séances</span>
            <select
              value={form.activityProfile}
              onChange={(e) =>
                setForm({ ...form, activityProfile: e.target.value as ActivityProfile })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="sedentary">Sédentaire (bureau)</option>
              <option value="lightly_active">Légèrement actif</option>
              <option value="active">Actif (debout / déplacements)</option>
              <option value="very_active">Très actif</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Objectif principal</span>
            <select
              value={form.primaryGoal}
              onChange={(e) => setForm({ ...form, primaryGoal: e.target.value as PrimaryGoal })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="fat_loss">Perte de masse grasse</option>
              <option value="recomposition">Recomposition (muscle + taille)</option>
              <option value="maintenance">Maintien &amp; Vitalité</option>
              <option value="muscle_gain">Prise de masse propre</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Rythme hebdo visé ({form.weeklyPaceKg} kg/sem)</span>
            <input
              type="range"
              min={-0.75}
              max={0.35}
              step={0.05}
              value={form.weeklyPaceKg}
              onChange={(e) => setForm({ ...form, weeklyPaceKg: Number(e.target.value) })}
              className="w-full accent-emerald-400 mt-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Accompagnement clinique dédié</span>
            <select
              value={form.specialMode}
              onChange={(e) => setForm({ ...form, specialMode: e.target.value as SpecialMode })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="standard">Standard équilibré</option>
              <option value="glp1_muscle_guard">GLP-1 (Protection muscle &amp; fibres)</option>
              <option value="glycemic_shield">Bouclier glycémique (CG basse)</option>
              <option value="cardio_low_sodium">Cardio &amp; Sel maîtrisé (&lt;1500 mg)</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            Heures silencieuses Push :
            <input
              type="time"
              value={form.quietHours.start}
              onChange={(e) =>
                setForm({ ...form, quietHours: { ...form.quietHours, start: e.target.value } })
              }
              className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white"
            />
            →
            <input
              type="time"
              value={form.quietHours.end}
              onChange={(e) =>
                setForm({ ...form, quietHours: { ...form.quietHours, end: e.target.value } })
              }
              className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onSaveProfile({ ...form, isDemoProfile: false });
              setProfileSavedMsg("Profil & calculs métaboliques mis à jour !");
              setProfileSheetOpen(false);
              setTimeout(() => setProfileSavedMsg(null), 3500);
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm"
          >
            Enregistrer mon profil
          </button>
        </div>
      </div>
      </DetailSheet>

      {/* Notifications Push & Challenges Personnalisés */}
      <div className="vp-card p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-400" />
              Challenges personnalisés &amp; Rappels Push
            </h3>
            <p className="text-xs text-slate-400">
              Créez vos propres défis ou suivez les challenges recommandés avec notifications Push Web &amp; Android (respectant vos heures silencieuses).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              Activer Push sur cet appareil
            </button>
            <button
              type="button"
              onClick={() => void handleSendTestPush()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700"
            >
              Tester rappel Push maintenant
            </button>
          </div>
        </div>

        {pushStatus && (
          <div className="rounded-xl bg-sky-500/15 border border-sky-400/35 p-3 text-xs text-sky-200">
            {pushStatus}
          </div>
        )}

        {/* Liste des challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map((ch) => {
            const doneToday = ch.completedDates.includes(todayBalance.dateKey);
            let currentTodayVal = 0;
            if (ch.metric === "steps") currentTodayVal = todayBalance.rawSteps;
            else if (ch.metric === "protein") currentTodayVal = Math.round(todayBalance.macros.proteinG);
            else if (ch.metric === "fiber") currentTodayVal = Math.round(todayBalance.macros.fiberG);
            else if (ch.metric === "water") currentTodayVal = todayBalance.waterMl;
            else if (ch.metric === "workout_minutes") currentTodayVal = todayBalance.workoutMinutes;

            const autoReached = ch.metric !== "custom" && ch.metric !== "no_nova4" && currentTodayVal >= ch.targetValue;
            const isDone = doneToday || autoReached;

            return (
              <div
                key={ch.id}
                className={`rounded-xl p-4 border text-xs space-y-2 ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-400/35"
                    : "bg-slate-900/85 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      {ch.title}
                    </h4>
                    <p className="text-slate-400 mt-0.5">{ch.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteChallenge(ch.id)}
                    aria-label="Supprimer challenge"
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-slate-300 tabular-nums">
                    {ch.metric !== "custom" && ch.metric !== "no_nova4"
                      ? `Aujourd'hui : ${currentTodayVal} / ${ch.targetValue} ${ch.unit}`
                      : `Cible : ${ch.targetValue} ${ch.unit}`}{" "}
                    · Rappel {ch.reminderTime} · {ch.completedDates.length}/{ch.durationDays} j
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleChallengeToday(ch.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold ${
                      isDone
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? "Validé aujourd'hui" : "Valider"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setChallengeSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
        >
          <PlusCircle className="w-4 h-4" />
          + Créer un nouveau challenge ou rappel personnalisé
        </button>

        {/* Modale création challenge */}
        <DetailSheet
          open={challengeSheetOpen}
          onClose={() => setChallengeSheetOpen(false)}
          title="Nouveau challenge & rappel Push"
          subtitle="Définissez votre objectif quotidien et l'heure du rappel"
          size="md"
        >
        <form
          onSubmit={handleCreateChallenge}
          className="space-y-3"
        >
          <strong className="text-xs text-emerald-300 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />
            Créer un nouveau challenge ou rappel d&apos;objectif personnalisé :
          </strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <input
              type="text"
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              placeholder="Titre (ex : 10 min marche après déjeuner)"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
            <input
              type="text"
              value={chDesc}
              onChange={(e) => setChDesc(e.target.value)}
              placeholder="Motivation / détail"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
            <select
              value={chMetric}
              onChange={(e) => {
                const m = e.target.value as ChallengeMetric;
                setChMetric(m);
                if (m === "steps") {
                  setChTarget(8000);
                  setChUnit("pas");
                } else if (m === "water") {
                  setChTarget(2000);
                  setChUnit("mL");
                } else if (m === "protein") {
                  setChTarget(130);
                  setChUnit("g");
                } else if (m === "workout_minutes") {
                  setChTarget(15);
                  setChUnit("min");
                } else {
                  setChTarget(1);
                  setChUnit("validation");
                }
              }}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="steps">Suivi automatique : Pas</option>
              <option value="protein">Suivi automatique : Protéines</option>
              <option value="fiber">Suivi automatique : Fibres</option>
              <option value="water">Suivi automatique : Eau</option>
              <option value="workout_minutes">Suivi automatique : Minutes exercice</option>
              <option value="custom">Challenge libre à cocher</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <label className="text-slate-400">
              Cible :
              <input
                type="number"
                value={chTarget}
                onChange={(e) => setChTarget(Number(e.target.value) || 1)}
                className="ml-1.5 w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <input
              type="text"
              value={chUnit}
              onChange={(e) => setChUnit(e.target.value)}
              placeholder="Unité"
              className="w-24 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
            />
            <label className="text-slate-400">
              Durée (j) :
              <input
                type="number"
                min={1}
                max={90}
                value={chDays}
                onChange={(e) => setChDays(Number(e.target.value) || 7)}
                className="ml-1.5 w-16 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <label className="text-slate-400">
              Rappel Push :
              <input
                type="time"
                value={chTime}
                onChange={(e) => setChTime(e.target.value)}
                className="ml-1.5 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <button
              type="submit"
              className="ml-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Ajouter challenge
            </button>
          </div>
        </form>
        </DetailSheet>
      </div>
    </div>
  );
}
