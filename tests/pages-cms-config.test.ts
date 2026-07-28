import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CATEGORIES } from "../src/site.js";

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
    expect(
      field("categories").options?.values?.map((value) => value.name),
    ).toEqual([...CATEGORIES]);
    expect(field("categories").options).toMatchObject({
      multiple: true,
      min: 1,
      max: 1,
    });
    expect(field("body").type).toBe("rich-text");
    expect(config.media[0]).toMatchObject({
      input: "content/media",
      output: "/media",
      rename: "random",
    });
  });

  it("exposes only the approved production redeploy action", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    expect(config.actions).toEqual([
      expect.objectContaining({
        name: "redeploy",
        label: "重新部署博客",
        workflow: "deploy.yml",
        ref: "current",
        cancelable: false,
      }),
    ]);
  });
});
