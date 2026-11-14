"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { MedicalEvidenceCard } from "@/types/vitalpulse";

interface MedicalFeedResponse {
  topic: string;
  topicLabelFr: string;
  institutionalRef: string;
  fetchedAt: string;
  pubmedLiveOk: boolean;
  liveArticles: MedicalEvidenceCard[];
  institutionalBaseline: MedicalEvidenceCard[];
}

const TOPICS = [
  { id: "weight_loss", label: "Perte de poids & Métabolisme" },
  { id: "muscle_protein", label: "Protéines & Muscle" },
  { id: "glycemic_nova", label: "NOVA & Glycémie" },
  { id: "vilpa_exercise", label: "Exercice & VILPA" },
  { id: "glp1_nutrition", label: "Accompagnement GLP-1" },
];

export function MedicalHubView() {
  const [topic, setTopic] = useState("weight_loss");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MedicalFeedResponse | null>(null);

  async function loadTopic(selected: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/medical-feed?topic=${encodeURIComponent(selected)}`);
      if (res.ok) {
        const json = (await res.json()) as MedicalFeedResponse;
        setData(json);
      }
    } catch {
      // ignore network timeout
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTopic(topic);
  }, [topic]);

  return (
    <div className="space-y-5">
      <div className="vp-card-accent p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Veille Médicale Live &amp; Référentiels Officiels
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Socle clinique certifié (OMS, HAS, ANSES Ciqual, EFSA, NICE, Compendium 2024) + interrogation directe de NCBI PubMed (méta-analyses &amp; essais cliniques).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadTopic(topic)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser PubMed
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                topic === t.id
                  ? "bg-emerald-500 text-slate-950 font-semibold"
                  : "bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flux PubMed Live */}
      <div className="vp-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Publications scientifiques récentes (NCBI PubMed Live)
          </h3>
          {data && (
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full ${
                data.pubmedLiveOk
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {data.pubmedLiveOk
                ? `Connecté en direct · ${new Date(data.fetchedAt).toLocaleTimeString("fr-FR")}`
                : "Socle hors-ligne affiché"}
            </span>
          )}
        </div>

        {data?.institutionalRef && (
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs text-sky-200">
            <strong>Référentiel clinique de cet axe :</strong> {data.institutionalRef}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.liveArticles ?? []).map((art) => (
            <div
              key={art.id}
              className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-300 mb-1">
                  <span>{art.source} · {art.year}</span>
                  {art.pmid && <span className="font-mono">PMID {art.pmid}</span>}
                </div>
                <h4 className="text-sm font-semibold text-white leading-snug">{art.title}</h4>
                <p className="text-xs text-slate-300 mt-2">{art.summaryFr}</p>
                <p className="text-xs text-emerald-300/90 mt-2">
                  <strong>Application pratique :</strong> {art.actionableTip}
                </p>
              </div>
              <a
                href={art.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-medium"
              >
                Lire la fiche sur PubMed
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Référentiels Institutionnels Permanents */}
      <div className="vp-card p-4 sm:p-5 space-y-3">
        <h3 className="text-base font-semibold text-white">
          Référentiels institutionnels permanents intégrés à FolloWeight
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.institutionalBaseline ?? []).map((card) => (
            <div
              key={card.id}
              className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-emerald-300 font-semibold">{card.source}</span>
                <span>{card.evidenceLevel}</span>
              </div>
              <h4 className="text-sm font-semibold text-white">{card.title}</h4>
              <p className="text-xs text-slate-300">{card.summaryFr}</p>
              <p className="text-xs text-sky-300">
                <strong>Repère :</strong> {card.actionableTip}
              </p>
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline"
              >
                Source officielle <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
