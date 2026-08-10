import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

import {
  CategorySourceSchema,
  HomeContentSchema,
  NavigationSchema,
  SiteSettingsSchema,
  type Category,
  type SiteSourceContent,
} from "../../src/site-content.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readYaml<T>(
  filePath: string,
  sourcePath: string,
  schema: { parse(value: unknown): T },
): T {
  try {
    return schema.parse(parse(readFileSync(filePath, "utf8")));
  } catch (error) {
    throw new Error(`${sourcePath}: ${errorMessage(error)}`);
  }
}

function assertUniqueCategories(categories: readonly Category[]): void {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const category of categories) {
    if (ids.has(category.id)) {
      throw new Error(
        `content/categories: duplicate category id ${category.id}`,
      );
    }
    if (slugs.has(category.slug)) {
      throw new Error(
        `content/categories: duplicate category slug ${category.slug}`,
      );
    }
    if (orders.has(category.order)) {
      throw new Error(
        `content/categories: duplicate category order ${category.order}`,
      );
    }
    ids.add(category.id);
    slugs.add(category.slug);
    orders.add(category.order);
  }
}

export function loadSiteContent(contentDir: string): SiteSourceContent {
  const siteDir = join(contentDir, "site");
  const categoriesDir = join(contentDir, "categories");
  const settings = readYaml(
    join(siteDir, "settings.yml"),
    "content/site/settings.yml",
    SiteSettingsSchema,
  );
  const home = readYaml(
    join(siteDir, "home.yml"),
    "content/site/home.yml",
    HomeContentSchema,
  );
  const navigation = readYaml(
    join(siteDir, "navigation.yml"),
    "content/site/navigation.yml",
    NavigationSchema,
  );
  const categories = readdirSync(categoriesDir)
    .filter((fileName) => fileName.endsWith(".yml"))
    .sort()
    .map((fileName): Category => {
      const parsed = readYaml(
        join(categoriesDir, fileName),
        `content/categories/${fileName}`,
        CategorySourceSchema,
      );
      return { ...parsed, slug: parsed.slug ?? parsed.id };
    });

  assertUniqueCategories(categories);
  categories.sort(
    (left, right) =>
      left.order - right.order || left.name.localeCompare(right.name),
  );

  return { settings, home, navigation, categories };
}
