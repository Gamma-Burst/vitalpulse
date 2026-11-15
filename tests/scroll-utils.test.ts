import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blurActiveEditableElement,
  scrollViewportToTop,
  type ScrollableContainerLike,
} from "@/lib/scroll-utils";

describe("scroll-utils (remise en haut automatique & clavier)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ne lève aucune erreur côté serveur sans window ni document", () => {
    expect(() => blurActiveEditableElement()).not.toThrow();
    expect(() =>
      scrollViewportToTop({
        container: { scrollTop: 280 },
      })
    ).not.toThrow();
  });

  it("remet container.scrollTop, window et documentElement à 0 en mode instantané", () => {
    const winScrollTo = vi.fn();
    let rafCb: FrameRequestCallback | undefined;

    vi.stubGlobal("window", {
      scrollTo: winScrollTo,
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        rafCb = cb;
        return 1;
      },
    });

    const docEl = { scrollTop: 190 };
    const bodyEl = { scrollTop: 95 };
    vi.stubGlobal("document", {
      documentElement: docEl,
      body: bodyEl,
    });

    const containerScrollTo = vi.fn();
    const container: ScrollableContainerLike = {
      scrollTop: 420,
      scrollTo: containerScrollTo,
    };

    scrollViewportToTop({ container });

    expect(container.scrollTop).toBe(0);
    expect(docEl.scrollTop).toBe(0);
    expect(bodyEl.scrollTop).toBe(0);
    expect(containerScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    expect(winScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    // Vérifie le second passage au frame suivant (layout / clavier mobile)
    container.scrollTop = 64;
    rafCb?.(16);
    expect(container.scrollTop).toBe(0);
  });

  it("utilise behavior smooth lorsque smooth: true est demandé", () => {
    const winScrollTo = vi.fn();
    vi.stubGlobal("window", { scrollTo: winScrollTo });

    const containerScrollTo = vi.fn();
    const container: ScrollableContainerLike = {
      scrollTop: 310,
      scrollTo: containerScrollTo,
    };

    scrollViewportToTop({ container, smooth: true });

    expect(containerScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
    expect(winScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });

  it("retire le focus uniquement des champs éditables (INPUT/SELECT/TEXTAREA)", () => {
    const blurInput = vi.fn();
    vi.stubGlobal("document", {
      activeElement: { tagName: "INPUT", blur: blurInput },
    });
    blurActiveEditableElement();
    expect(blurInput).toHaveBeenCalledTimes(1);

    const blurButton = vi.fn();
    vi.stubGlobal("document", {
      activeElement: { tagName: "BUTTON", blur: blurButton },
    });
    blurActiveEditableElement();
    expect(blurButton).not.toHaveBeenCalled();
  });
});
