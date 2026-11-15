export interface ScrollableContainerLike {
  scrollTop: number;
  scrollTo?: (options?: ScrollToOptions) => void;
}

const EDITABLE_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

/**
 * Retire le focus du champ actif (input, select, textarea) afin de refermer
 * proprement le clavier tactile iOS/Android avant une transition ou un scroll.
 */
export function blurActiveEditableElement(): void {
  if (typeof document === "undefined") return;
  const active = document.activeElement as {
    tagName?: string;
    blur?: () => void;
  } | null;
  if (
    active &&
    typeof active.blur === "function" &&
    EDITABLE_TAGS.has((active.tagName || "").toUpperCase())
  ) {
    active.blur();
  }
}

/**
 * Remonte en haut de la page (et/ou d'un conteneur scrollable interne tel que
 * la modale d'onboarding) sans erreur côté serveur.
 */
export function scrollViewportToTop(options?: {
  container?: ScrollableContainerLike | null;
  smooth?: boolean;
}): void {
  if (typeof window === "undefined") return;

  if (options?.smooth) {
    options.container?.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
    window.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
    return;
  }

  const resetInstant = () => {
    if (options?.container) {
      options.container.scrollTop = 0;
      options.container.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    }
    window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    if (typeof document !== "undefined") {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  };

  resetInstant();
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => resetInstant());
  }
}
