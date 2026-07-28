import {
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
