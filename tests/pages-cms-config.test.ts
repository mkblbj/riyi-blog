import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CATEGORIES } from "../src/site.js";

describe("Pages CMS configuration", () => {
  it("maps the complete article contract to a safe Chinese form", async () => {
    const config = parse(await readFile(".pages.yml", "utf8"));
    const posts = config.content.find(
      (entry: { name: string }) => entry.name === "posts",
    );
    const fields = new Map(
      posts.fields.map((field: { name: string }) => [field.name, field]),
    );

    expect(posts.path).toBe("content/posts");
    expect(posts.filename).toEqual({ template: "{id}.md", field: false });
    expect(posts.operations).toEqual({
      create: true,
      rename: false,
      delete: false,
    });
    expect(fields.get("id").type).toBe("uuid");
    expect(fields.get("id").options.editable).toBe(false);
    expect(fields.get("status").default).toBe("draft");
    expect(
      fields
        .get("categories")
        .options.values.map((value: { name: string }) => value.name),
    ).toEqual([...CATEGORIES]);
    expect(fields.get("categories").options).toMatchObject({
      multiple: true,
      min: 1,
      max: 1,
    });
    expect(fields.get("body").type).toBe("rich-text");
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
