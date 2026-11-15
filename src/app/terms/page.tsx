import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions d'utilisation & Avertissement Santé — FolloWeight",
  description:
    "Conditions générales d'utilisation et de vente FolloWeight / FW+, transparence IA (EU AI Act) et avertissement santé non médical.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à FolloWeight
          </Link>
          <span className="text-[11px] text-slate-400">
            En vigueur : 15 novembre 2026
          </span>
        </div>

        <article className="vp-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-200">
          <header className="space-y-2 border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
              <FileText className="h-3.5 w-3.5" />
              CGU / CGV &amp; Transparence IA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Conditions d&apos;utilisation et Avertissement Santé
            </h1>
          </header>

          <section className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 space-y-1.5">
            <h2 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Outil éducatif de bien-être — Aucun avis ni diagnostic médical
            </h2>
            <p className="text-xs text-amber-100/90">
              FolloWeight (y compris Coach FW AI, l&apos;estimateur nutritionnel photo et la lecture éducative de bilans sanguins) est exclusivement un outil pédagogique de suivi nutritionnel et sportif. Il ne constitue ni un dispositif médical, ni un diagnostic, ni une prescription. En cas d&apos;urgence médicale ou de détresse psychologique, contactez le <strong>15</strong>, le <strong>112</strong> ou le <strong>3114</strong> (France). FolloWeight interdit le jeûne strict et les régimes restrictifs aux mineurs (&lt; 18 ans) et durant la grossesse.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              1. Version gratuite à vie vs Abonnement FolloWeight Plus (FW+)
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>FolloWeight Essentiel (0 €) :</strong> suivi poids EMA, scan code-barres illimité, minuteur de jeûne/OMAD, 44 exercices, analyse sanguine déterministe locale, plus 5 questions Coach FW AI et 3 scans photo par jour.
              </li>
              <li>
                <strong>FolloWeight Plus (FW+) :</strong> <strong>29,99 € / an</strong> (avec 7 jours d&apos;essai gratuit, soit 2,49 € / mois) ou <strong>4,99 € / mois</strong> sans engagement. Usage personnel raisonnable jusqu&apos;à 80 requêtes Coach/Vision par jour (dont 5 recherches Web temps réel par jour / 30 par mois).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              2. Résiliation &amp; Remboursement
            </h2>
            <p>
              Les abonnements souscrits via Google Play peuvent être résiliés à tout moment depuis{" "}
              <strong>Google Play &gt; Paiements et abonnements</strong> (au moins 24 h avant la fin de l&apos;essai ou de la période en cours pour éviter le renouvellement). Les abonnements souscrits sur{" "}
              <code className="text-emerald-300">followeight.com</code> sont résiliables en 2 clics depuis le portail client Stripe.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              3. Liens associés &amp; Suppression
            </h2>
            <p className="text-slate-300">
              Consultez notre{" "}
              <Link href="/privacy" className="text-emerald-300 underline">
                Politique de confidentialité
              </Link>{" "}
              ou notre page{" "}
              <Link href="/delete-account" className="text-emerald-300 underline">
                Effacer mes données et mon compte
              </Link>
              . Support :{" "}
              <a
                href="mailto:support@followeight.com"
                className="text-emerald-300 underline"
              >
                support@followeight.com
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
