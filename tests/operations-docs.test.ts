import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const docs = [
  "README.md",
  "docs/operations/alibaba-cloud.md",
  "docs/operations/deployment.md",
  "docs/operations/rollback.md",
  "docs/operations/acceptance.md",
  "docs/customer/publishing.md",
];

describe("operations handoff", () => {
  it("documents every production control plane", async () => {
    const text = (
      await Promise.all(docs.map((path) => readFile(path, "utf8")))
    ).join("\n");
    for (const required of [
      "www.riyihome.com",
      "oss-ap-northeast-1",
      "ALIYUN_ACCESS_KEY_ID",
      "ALIYUN_CLEANUP_ACCESS_KEY_ID",
      "Pages CMS",
      "Git revert",
      "CNAME",
      "HTTPS",
    ]) {
      expect(text).toContain(required);
    }
  });

  it("contains no Alibaba access key or private key", async () => {
    const text = (
      await Promise.all(docs.map((path) => readFile(path, "utf8")))
    ).join("\n");
    expect(text).not.toMatch(/LTAI[A-Za-z0-9]{12,}/);
    expect(text).not.toContain("BEGIN PRIVATE KEY");
  });
});
