import { describe, expect, it, vi } from "vitest";
import { refreshUrls, urlsForRefresh } from "../scripts/deploy/cdn.js";
import {
  runCleanup,
  selectCleanupCandidates,
} from "../scripts/deploy/cleanup.js";
import {
  removeStaleHtml,
  uploadPlan,
} from "../scripts/deploy/oss.js";

describe("deployment adapters", () => {
  it("finishes every asset before uploading documents", async () => {
    const calls: string[] = [];
    const client = {
      put: vi.fn(async (name: string) => {
        calls.push(name);
        return {};
      }),
    };
    await uploadPlan(client, {
      assets: [
        {
          objectName: "assets/app.hash.js",
          localPath: "/tmp/app.js",
          cacheControl: "immutable",
          contentType: "text/javascript; charset=utf-8",
        },
      ],
      documents: [
        {
          objectName: "index.html",
          localPath: "/tmp/index.html",
          cacheControl: "short",
          contentType: "text/html; charset=utf-8",
        },
      ],
    });
    expect(calls).toEqual(["assets/app.hash.js", "index.html"]);
  });

  it("removes only stale HTML after upload and keeps old hashed assets", async () => {
    const deleteMulti = vi.fn(async () => ({}));
    const client = {
      listV2: vi.fn(async () => ({
        objects: [
          {
            name: "index.html",
            lastModified: "2026-07-28T00:00:00.000Z",
          },
          {
            name: "posts/archived/index.html",
            lastModified: "2026-07-27T00:00:00.000Z",
          },
          {
            name: "assets/old.222222222222.js",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: false,
      })),
      deleteMulti,
    };
    await expect(
      removeStaleHtml(client, new Set(["index.html"])),
    ).resolves.toEqual(["posts/archived/index.html"]);
    expect(deleteMulti).toHaveBeenCalledWith(
      ["posts/archived/index.html"],
      { quiet: true },
    );
  });

  it("maps object names to canonical CDN URLs and batches refreshes", async () => {
    expect(
      urlsForRefresh([
        "index.html",
        "posts/id/index.html",
        "rss.xml",
        "assets/app.hash.js",
      ]),
    ).toEqual([
      "https://www.riyihome.com/",
      "https://www.riyihome.com/posts/id/",
      "https://www.riyihome.com/rss.xml",
    ]);
    const client = { request: vi.fn(async () => ({})) };
    const urls = Array.from(
      { length: 1001 },
      (_, index) => `https://www.riyihome.com/page-${index}.html`,
    );
    await refreshUrls(client, urls);
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it("cleans only unreferenced hashed objects older than 180 days", () => {
    const now = new Date("2027-02-01T00:00:00.000Z");
    const objects = [
      {
        name: "assets/current.111111111111.js",
        lastModified: "2026-01-01T00:00:00.000Z",
      },
      {
        name: "assets/old.222222222222.js",
        lastModified: "2026-01-01T00:00:00.000Z",
      },
      {
        name: "assets/recent.333333333333.js",
        lastModified: "2027-01-01T00:00:00.000Z",
      },
      {
        name: "index.html",
        lastModified: "2026-01-01T00:00:00.000Z",
      },
    ];
    expect(
      selectCleanupCandidates(
        objects,
        new Set(["assets/current.111111111111.js"]),
        now,
      ).map((object) => object.name),
    ).toEqual(["assets/old.222222222222.js"]);
  });

  it("lists but does not delete candidates in dry-run mode", async () => {
    const deleteMulti = vi.fn(async () => ({}));
    const client = {
      listV2: vi.fn(async () => ({
        objects: [
          {
            name: "assets/old.222222222222.js",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: false,
      })),
      deleteMulti,
    };
    const candidates = await runCleanup(
      client,
      new Set(),
      new Date("2027-02-01T00:00:00.000Z"),
      true,
    );
    expect(candidates.map((object) => object.name)).toEqual([
      "assets/old.222222222222.js",
    ]);
    expect(deleteMulti).not.toHaveBeenCalled();
  });

  it("deletes only selected candidates in explicit live mode", async () => {
    const deleteMulti = vi.fn(async () => ({}));
    const client = {
      listV2: vi.fn(async () => ({
        objects: [
          {
            name: "assets/old.222222222222.js",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
          {
            name: "index.html",
            lastModified: "2026-01-01T00:00:00.000Z",
          },
        ],
        isTruncated: false,
      })),
      deleteMulti,
    };
    await runCleanup(
      client,
      new Set(),
      new Date("2027-02-01T00:00:00.000Z"),
      false,
    );
    expect(deleteMulti).toHaveBeenCalledWith(
      ["assets/old.222222222222.js"],
      { quiet: true },
    );
  });
});
