import Core from "@alicloud/pop-core";
import { SITE_URL } from "../../src/site.js";

export interface CdnClient {
  request(
    action: string,
    params: Record<string, string>,
    options: { method: "POST" },
  ): Promise<unknown>;
}

export interface CdnEnvironment {
  ALIYUN_ACCESS_KEY_ID: string;
  ALIYUN_ACCESS_KEY_SECRET: string;
}

export function createCdnClient(env: CdnEnvironment): CdnClient {
  return new Core({
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: "https://cdn.aliyuncs.com",
    apiVersion: "2018-05-10",
  });
}

export function urlsForRefresh(objectNames: string[]): string[] {
  return objectNames
    .filter(
      (name) =>
        name.endsWith(".html") ||
        ["rss.xml", "sitemap.xml", "robots.txt"].includes(name),
    )
    .map((name) => {
      if (name === "index.html") return `${SITE_URL}/`;
      if (name.endsWith("/index.html")) {
        return `${SITE_URL}/${name.slice(0, -"index.html".length)}`;
      }
      return `${SITE_URL}/${name}`;
    })
    .sort();
}

export async function refreshUrls(
  client: CdnClient,
  urls: string[],
): Promise<void> {
  for (let offset = 0; offset < urls.length; offset += 1000) {
    const batch = urls.slice(offset, offset + 1000);
    await client.request(
      "RefreshObjectCaches",
      { ObjectPath: batch.join("\n"), ObjectType: "File" },
      { method: "POST" },
    );
  }
}
