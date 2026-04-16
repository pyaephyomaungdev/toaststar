import { describe, expect, it } from "vitest";
import { resolveToastTheme } from "../themes";
import type { ToastAppearance, ToastIntent, ToastThemeName } from "../types";

describe("resolveToastTheme", () => {
  const themes: ToastThemeName[] = ["glass", "light", "midnight", "sunset", "forest", "ocean"];
  const intents: ToastIntent[] = ["default", "success", "error", "warning", "info"];

  it.each(themes)("resolves preset %s without errors", (theme) => {
    const resolved = resolveToastTheme(theme, "default");
    expect(resolved.radius).toBeTruthy();
    expect(resolved.background).toBeTruthy();
    expect(resolved.color).toBeTruthy();
    expect(resolved.accent).toBeTruthy();
    expect(resolved.width).toBeTruthy();
  });

  it.each(intents)("assigns a unique accent color for intent %s", (intent) => {
    const resolved = resolveToastTheme("glass", intent);
    expect(resolved.accent).toBeTruthy();
    expect(resolved.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("uses different accent colors for different intents", () => {
    const accents = intents.map((intent) => resolveToastTheme("glass", intent).accent);
    const unique = new Set(accents);
    expect(unique.size).toBe(intents.length);
  });

  it("applies provider appearance overrides", () => {
    const providerAppearance: ToastAppearance = {
      background: "red",
      radius: 8,
    };
    const resolved = resolveToastTheme("glass", "default", providerAppearance);
    expect(resolved.background).toBe("red");
    expect(resolved.radius).toBe("8px");
  });

  it("applies toast appearance overrides over provider", () => {
    const providerAppearance: ToastAppearance = {
      background: "red",
    };
    const toastAppearance: ToastAppearance = {
      background: "blue",
    };
    const resolved = resolveToastTheme("glass", "default", providerAppearance, toastAppearance);
    expect(resolved.background).toBe("blue");
  });

  it("converts numeric radius to px string", () => {
    const resolved = resolveToastTheme("glass", "default", { radius: 12 });
    expect(resolved.radius).toBe("12px");
  });

  it("keeps string radius as-is", () => {
    const resolved = resolveToastTheme("glass", "default", { radius: "2rem" });
    expect(resolved.radius).toBe("2rem");
  });

  it("falls back to glass preset for unknown theme", () => {
    const resolved = resolveToastTheme("nonexistent" as ToastThemeName, "default");
    const glass = resolveToastTheme("glass", "default");
    expect(resolved.background).toBe(glass.background);
    expect(resolved.radius).toBe(glass.radius);
  });

  it("allows accent override via appearance", () => {
    const resolved = resolveToastTheme("glass", "success", undefined, { accent: "#ff0000" });
    expect(resolved.accent).toBe("#ff0000");
  });

  it("preserves closeButtonBackground from preset when not overridden", () => {
    const resolved = resolveToastTheme("midnight", "default");
    expect(resolved.closeButtonBackground).toBeTruthy();
    expect(resolved.closeButtonBackground).toContain("rgba");
  });
});
