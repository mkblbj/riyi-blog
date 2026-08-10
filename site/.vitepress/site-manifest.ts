import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteContent } from "../../scripts/content/load-site.js";
import {
  resolveSiteContent,
  SiteManifestSchema,
  type SiteManifest,
} from "../../src/site-content.js";
import { createThemeTokens } from "../../src/theme-colors.js";

const defaultProjectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function loadRuntimeSiteManifest(
  projectRoot = defaultProjectRoot,
): SiteManifest {
  const manifestPath = join(projectRoot, ".generated/site.json");

  try {
    return SiteManifestSchema.parse(
      JSON.parse(readFileSync(manifestPath, "utf8")),
    );
  } catch (error) {
    if (!isMissingFile(error)) {
      throw new Error(`${manifestPath}: ${errorMessage(error)}`, {
        cause: error,
      });
    }
  }

  const content = resolveSiteContent(
    loadSiteContent(join(projectRoot, "content")),
  );
  return SiteManifestSchema.parse({
    generatedAt: new Date().toISOString(),
    content,
    themeTokens: createThemeTokens(
      content.settings.primaryColor,
      content.settings.secondaryColor,
    ),
  });
}

export const runtimeSiteManifest = loadRuntimeSiteManifest();
