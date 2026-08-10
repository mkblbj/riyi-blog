import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

async function workflow(name: string) {
  return parse(await readFile(`.github/workflows/${name}.yml`, "utf8"));
}

describe("GitHub Actions", () => {
  it("builds main, accepts the Pages CMS payload, and always enters the production environment", async () => {
    const deploy = await workflow("deploy");
    expect(deploy.on.push.branches).toEqual(["main"]);
    expect(deploy.on.workflow_dispatch.inputs.payload).toMatchObject({
      required: false,
      type: "string",
    });
    expect(deploy.jobs.deploy.environment).toBe("production");
    expect(deploy.jobs.deploy.if).toBeUndefined();
    expect(deploy.jobs.deploy.concurrency).toEqual({
      group: "riyi-blog-production",
      "cancel-in-progress": false,
    });
  });

  it("keeps deploy and cleanup credentials separate", async () => {
    const deployText = await readFile(".github/workflows/deploy.yml", "utf8");
    const cleanupText = await readFile(".github/workflows/cleanup.yml", "utf8");
    expect(deployText).toContain("secrets.ALIYUN_ACCESS_KEY_ID");
    expect(deployText).not.toContain("ALIYUN_CLEANUP_ACCESS_KEY_ID");
    expect(cleanupText).toContain("secrets.ALIYUN_CLEANUP_ACCESS_KEY_ID");
    expect(cleanupText).not.toContain("secrets.ALIYUN_ACCESS_KEY_ID");
  });

  it("publishes both manifests and gates deployment on the build job", async () => {
    const deploy = await workflow("deploy");
    const artifactStep = deploy.jobs.build.steps.find(
      (step: Record<string, unknown>) =>
        step.uses === "actions/upload-artifact@v4",
    );
    const artifactPaths = String(artifactStep?.with?.path)
      .split("\n")
      .map((path) => path.trim())
      .filter(Boolean);

    expect(artifactPaths).toEqual(
      expect.arrayContaining([
        "site/.vitepress/dist",
        ".generated/posts.json",
        ".generated/site.json",
      ]),
    );
    expect(deploy.jobs.deploy.needs).toBe("build");
  });
});
