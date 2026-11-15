import { describe, expect, it } from "vitest";
import {
  buildDeterministicFwAiReply,
  cleanFwAiInlineCitations,
  extractOpenAiResponsesWebData,
} from "@/lib/fw-ai-engine";

describe("FW AI connecté Web & garde-fous cliniques", () => {
  it("nettoie les citations Markdown en ligne tout en préservant les sauts de ligne", () => {
    const raw =
      "Oui, je suis connecté en direct. Un Big Mac contient environ 530 kcal ([m.mcdonalds.fr](https://m.mcdonalds.fr/nos-produits/nos-burgers/big-mac?utm_source=openai)) .\nVoir [l'étude PubMed](https://pubmed.ncbi.nlm.nih.gov/12345/) pour plus de détails .";

    const cleaned = cleanFwAiInlineCitations(raw);

    expect(cleaned).toBe(
      "Oui, je suis connecté en direct. Un Big Mac contient environ 530 kcal.\nVoir l'étude PubMed pour plus de détails."
    );
    expect(cleaned).not.toContain("utm_source");
    expect(cleaned).not.toContain("https://");
  });

  it("extrait web_search_call, le texte JSON et déduplique jusqu'à 4 sources sans utm_source", () => {
    const sampleOutput = [
      {
        id: "ws_1",
        type: "web_search_call",
        status: "completed",
        action: { type: "search", query: "Big Mac calories France" },
      },
      {
        id: "msg_1",
        type: "message",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: '{"replyFr":"Réponse test","quickActions":["Action 1","Action 2"]}',
            annotations: [
              {
                type: "url_citation",
                title: "Burger Big Mac | McDonald's France",
                url: "https://www.mcdonalds.fr/nos-produits/big-mac?utm_source=openai",
              },
              {
                type: "url_citation",
                title: "Doublon sans www",
                url: "https://www.mcdonalds.fr/nos-produits/big-mac?utm_source=openai",
              },
              {
                type: "url_citation",
                title: "ANSES Ciqual",
                url: "https://ciqual.anses.fr/#/aliments/25410?utm_source=openai",
              },
              {
                type: "url_citation",
                title: "PubMed Étude",
                url: "https://pubmed.ncbi.nlm.nih.gov/42965609/?v=2&utm_source=openai",
              },
              {
                type: "url_citation",
                title: "HAS France",
                url: "https://www.has-sante.fr/portail?utm_source=openai",
              },
              {
                type: "url_citation",
                title: "Source 5 ignorée (plafond 4)",
                url: "https://www.who.int/health-topics?utm_source=openai",
              },
              {
                type: "url_citation",
                title: "URL invalide",
                url: "not-a-valid-url",
              },
            ],
          },
        ],
      },
    ];

    const extracted = extractOpenAiResponsesWebData(sampleOutput);

    expect(extracted.webSearchUsed).toBe(true);
    expect(extracted.rawJsonText).toContain("Réponse test");
    expect(extracted.sources).toHaveLength(4);
    expect(extracted.sources[0]).toEqual({
      title: "Burger Big Mac | McDonald's France",
      url: "https://www.mcdonalds.fr/nos-produits/big-mac",
      domain: "mcdonalds.fr",
    });
    expect(extracted.sources[2].url).toBe(
      "https://pubmed.ncbi.nlm.nih.gov/42965609/?v=2"
    );
    expect(extracted.sources.some((s) => s.domain === "who.int")).toBe(false);
  });

  it("gère proprement une sortie vide ou sans web_search_call", () => {
    const empty = extractOpenAiResponsesWebData(null);
    expect(empty).toEqual({
      rawJsonText: "",
      webSearchUsed: false,
      sources: [],
    });
  });

  it("conserve la priorité absolue des garde-fous cliniques avant tout appel Web", () => {
    const emergency = buildDeterministicFwAiReply({
      question: "J'ai une douleur thoracique depuis ce matin",
    });
    expect(emergency.safetyGuardTriggered).toBe(true);
    expect(emergency.provider).toBe("clinical-deterministic");
    expect(emergency.replyFr).toContain("15");

    const extremeDiet = buildDeterministicFwAiReply({
      question: "Je veux faire un régime 600 kcal pour perdre vite",
    });
    expect(extremeDiet.safetyGuardTriggered).toBe(true);

    const safeQuestion = buildDeterministicFwAiReply({
      question: "Combien de protéines dans 150 g de poulet ?",
    });
    expect(safeQuestion.safetyGuardTriggered).toBe(false);
  });
});
