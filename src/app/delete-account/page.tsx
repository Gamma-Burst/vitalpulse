import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { DeleteLocalDataButton } from "@/components/DeleteLocalDataButton";

export const metadata: Metadata = {
  title: "Supprimer mes données & compte — FolloWeight",
  description:
    "Suppression immédiate en 1 clic des données locales FolloWeight (poids, photos, repas, jeûne) et procédure RGPD pour Google Play.",
};

export default function DeleteAccountPage() {
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
        </div>

        <article className="vp-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-200">
          <header className="space-y-2 border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              Contrôle total &amp; Suppression RGPD
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Supprimer mes données et mon compte FolloWeight
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              FolloWeight ne stocke pas vos mesures de santé sur un serveur central : vos repas, poids, photos corporelles et bilans restent dans la mémoire chiffrée de votre navigateur ou téléphone.
            </p>
          </header>

          <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-white">
              1. Effacement immédiat en 1 clic sur cet appareil
            </h2>
            <p className="text-xs text-slate-300">
              Le bouton ci-dessous supprime définitivement votre base{" "}
              <code className="text-rose-200">vitalpulse_idb</code> (profil, pesées, repas, mensurations, photos avant/après, bilans sanguins, historique FW AI), réinitialise vos clés locales et désactive les notifications Push de cet appareil.
            </p>
            <DeleteLocalDataButton />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              2. Résilier un abonnement actif &amp; purge facturation
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>Abonnement Android (Google Play) :</strong> la suppression de l&apos;application ou des données locales ne résilie pas automatiquement un abonnement Google Play. Ouvrez{" "}
                <strong>Google Play Store &gt; Profil &gt; Paiements et abonnements</strong> pour annuler en 2 clics.
              </li>
              <li>
                <strong>Abonnement Web (followeight.com) ou suppression d&apos;un reçu e-mail :</strong> écrivez à{" "}
                <a
                  href="mailto:support@followeight.com?subject=Suppression%20donnees%20FolloWeight"
                  className="text-emerald-300 underline"
                >
                  support@followeight.com
                </a>{" "}
                avec l&apos;adresse e-mail utilisée (réponse et purge sous 48 h ouvrées).
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
