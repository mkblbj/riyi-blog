import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("official site brand CSS", () => {
  it("styles every official-site section", async () => {
    const css = await readFile(
      "site/.vitepress/theme/custom.css",
      "utf8",
    );

    for (const selector of [
      ".riyi-home-promotion",
      ".riyi-app-download",
      ".riyi-app-download__actions",
      ".riyi-download-action",
      ".riyi-mini-program-token",
      ".riyi-service-grid",
      ".riyi-advantage-grid",
      ".riyi-action-panel",
      ".riyi-section-heading",
      ".riyi-article-cta",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("keeps keyboard, mobile and reduced-motion affordances", async () => {
    const css = await readFile(
      "site/.vitepress/theme/custom.css",
      "utf8",
    );

    expect(css).toMatch(/\.riyi-action-link[^\n]*:focus-visible/);
    expect(css).toMatch(
      /\.riyi-download-action[^\n]*:focus-visible/,
    );
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.riyi-download-action/,
    );
  });
});
