import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface CmsField {
  name: string;
  type?: string;
  default?: unknown;
  options?: {
    editable?: boolean;
    values?: Array<{ name: string }>;
    multiple?: boolean;
    min?: number;
    max?: number;
  };
}

describe("Pages CMS configuration", () => {
  it("maps the complete article contract to a safe Chinese form", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    const posts = config.content.find(
      (entry: { name: string }) => entry.name === "posts",
    );
    const fields = new Map<string, CmsField>(
      posts.fields.map((field: CmsField) => [field.name, field]),
    );
    const field = (name: string) => {
      const value = fields.get(name);
      if (!value) throw new Error(`Missing CMS field: ${name}`);
      return value;
    };

    expect(posts.path).toBe("content/posts");
    expect(posts.filename).toEqual({ template: "{id}.md", field: false });
    expect(posts.operations).toEqual({
      create: true,
      rename: false,
      delete: false,
    });
    expect(field("id").type).toBe("uuid");
    expect(field("id").options?.editable).toBe(false);
    expect(field("status").default).toBe("draft");
    expect(field("body").type).toBe("rich-text");
    expect(config.media[0]).toMatchObject({
      input: "content/media",
      output: "/media",
      rename: "random",
    });
  });

  it("exposes protected official-site settings and media", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    expect(config.media).toContainEqual(
      expect.objectContaining({
        name: "site_images",
        label: "官网图片",
        input: "content/site-media",
        output: "/site-media",
        rename: "random",
        extensions: ["jpg", "jpeg", "png", "webp"],
      }),
    );

    const official = config.content.find(
      (entry: { name: string }) => entry.name === "official_site",
    );
    expect(official).toMatchObject({ type: "group", label: "官网管理" });
    expect(official.items.map((item: { name: string }) => item.name)).toEqual([
      "site_settings",
      "home_content",
      "navigation",
      "categories",
    ]);

    for (const name of ["site_settings", "home_content", "navigation"]) {
      const entry = official.items.find((item: { name: string }) => item.name === name);
      expect(entry.operations).toMatchObject({ delete: false, rename: false });
    }
  });

  it("uses safe dynamic category references without hard deletion", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    const official = config.content.find(
      (entry: { name: string }) => entry.name === "official_site",
    );
    const categories = official.items.find(
      (entry: { name: string }) => entry.name === "categories",
    );
    expect(categories).toMatchObject({
      type: "collection",
      path: "content/categories",
      format: "yaml",
      filename: { template: "{id}.yml", field: false },
      operations: { create: true, rename: false, delete: false },
    });

    const posts = config.content.find(
      (entry: { name: string }) => entry.name === "posts",
    );
    const categoryField = posts.fields.find(
      (field: { name: string }) => field.name === "categories",
    );
    expect(categoryField).toMatchObject({
      type: "reference",
      options: {
        collection: "categories",
        multiple: true,
        min: 1,
        max: 1,
        value: "{fields.id}",
        label: "{fields.name}",
      },
    });
  });

  it("exposes only the approved production redeploy action", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    expect(config.actions).toEqual([
      expect.objectContaining({
        name: "redeploy",
        label: "重新部署官网",
        workflow: "deploy.yml",
        ref: "current",
        cancelable: false,
      }),
    ]);
  });
});
