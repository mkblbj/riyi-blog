import { resolve } from "node:path";
import { planUpload } from "./cache-policy.js";
import {
  createOssClient,
  listAllObjects,
  type OssListDeleteClient,
  type RemoteOssObject,
} from "./oss.js";

export const CLEANUP_RETENTION_DAYS = 180;

export function selectCleanupCandidates(
  objects: RemoteOssObject[],
  currentObjectNames: ReadonlySet<string>,
  now: Date,
): RemoteOssObject[] {
  const cutoff =
    now.getTime() - CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return objects
    .filter((object) => /\.[a-f0-9]{8,}\./i.test(object.name))
    .filter((object) => !currentObjectNames.has(object.name))
    .filter((object) => new Date(object.lastModified).getTime() < cutoff)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function runCleanup(
  client: OssListDeleteClient,
  currentObjectNames: ReadonlySet<string>,
  now: Date,
  dryRun: boolean,
): Promise<RemoteOssObject[]> {
  const candidates = selectCleanupCandidates(
    await listAllObjects(client),
    currentObjectNames,
    now,
  );
  for (const object of candidates) {
    console.log(`${dryRun ? "would delete" : "delete"}: ${object.name}`);
  }
  if (dryRun) return candidates;

  for (let offset = 0; offset < candidates.length; offset += 100) {
    await client.deleteMulti(
      candidates
        .slice(offset, offset + 100)
        .map((object) => object.name),
      { quiet: true },
    );
  }
  return candidates;
}

if (process.argv[1]?.endsWith("cleanup.ts")) {
  const dryRun = process.env.CLEANUP_DRY_RUN !== "false";
  const required = [
    "ALIYUN_CLEANUP_ACCESS_KEY_ID",
    "ALIYUN_CLEANUP_ACCESS_KEY_SECRET",
    "ALIYUN_OSS_REGION",
    "ALIYUN_OSS_BUCKET",
  ] as const;
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Missing cleanup environment: ${missing.join(", ")}`,
    );
  }
  const plan = await planUpload(
    resolve(import.meta.dirname, "../../site/.vitepress/dist"),
  );
  const current = new Set(
    [...plan.assets, ...plan.documents].map((entry) => entry.objectName),
  );
  const client = createOssClient({
    ALIYUN_ACCESS_KEY_ID:
      process.env.ALIYUN_CLEANUP_ACCESS_KEY_ID!,
    ALIYUN_ACCESS_KEY_SECRET:
      process.env.ALIYUN_CLEANUP_ACCESS_KEY_SECRET!,
    ALIYUN_OSS_REGION: process.env.ALIYUN_OSS_REGION!,
    ALIYUN_OSS_BUCKET: process.env.ALIYUN_OSS_BUCKET!,
  }) as unknown as OssListDeleteClient;
  await runCleanup(client, current, new Date(), dryRun);
}
