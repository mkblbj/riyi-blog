import OSS from "ali-oss";
import type { UploadPlan } from "./cache-policy.js";

export interface OssPutClient {
  put(
    name: string,
    file: string,
    options: { headers: Record<string, string> },
  ): Promise<unknown>;
}

export interface RemoteOssObject {
  name: string;
  lastModified: string;
}

export interface OssListDeleteClient {
  listV2(query: {
    "max-keys": number;
    "continuation-token"?: string;
  }): Promise<{
    objects?: RemoteOssObject[];
    isTruncated?: boolean;
    nextContinuationToken?: string;
  }>;
  deleteMulti(
    names: string[],
    options: { quiet: boolean },
  ): Promise<unknown>;
}

export type OssDeployClient = OssPutClient & OssListDeleteClient;

export interface OssEnvironment {
  ALIYUN_ACCESS_KEY_ID: string;
  ALIYUN_ACCESS_KEY_SECRET: string;
  ALIYUN_OSS_REGION: string;
  ALIYUN_OSS_BUCKET: string;
}

export function createOssClient(env: OssEnvironment): OssDeployClient {
  return new OSS({
    region: env.ALIYUN_OSS_REGION,
    bucket: env.ALIYUN_OSS_BUCKET,
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    secure: true,
    timeout: 120_000,
  }) as unknown as OssDeployClient;
}

export async function uploadPlan(
  client: OssPutClient,
  plan: UploadPlan,
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const group of [plan.assets, plan.documents]) {
    for (const entry of group) {
      await client.put(entry.objectName, entry.localPath, {
        headers: {
          "Cache-Control": entry.cacheControl,
          "Content-Type": entry.contentType,
        },
      });
      uploaded.push(entry.objectName);
    }
  }
  return uploaded;
}

export async function listAllObjects(
  client: OssListDeleteClient,
): Promise<RemoteOssObject[]> {
  const objects: RemoteOssObject[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await client.listV2({
      "max-keys": 1000,
      ...(continuationToken
        ? { "continuation-token": continuationToken }
        : {}),
    });
    objects.push(...(result.objects ?? []));
    continuationToken = result.isTruncated
      ? result.nextContinuationToken
      : undefined;
    if (result.isTruncated && !continuationToken) {
      throw new Error(
        "OSS listV2 was truncated without a continuation token",
      );
    }
  } while (continuationToken);
  return objects;
}

export async function removeStaleHtml(
  client: OssListDeleteClient,
  currentObjectNames: ReadonlySet<string>,
): Promise<string[]> {
  const stale = (await listAllObjects(client))
    .map((object) => object.name)
    .filter((name) => name.endsWith(".html"))
    .filter((name) => !currentObjectNames.has(name))
    .sort();
  for (let offset = 0; offset < stale.length; offset += 100) {
    await client.deleteMulti(stale.slice(offset, offset + 100), {
      quiet: true,
    });
  }
  return stale;
}
