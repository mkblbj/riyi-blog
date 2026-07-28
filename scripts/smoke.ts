import { parseArgs } from "node:util";

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function smoke(
  baseUrl: string,
  paths: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (const path of [...new Set(paths)]) {
    const url = new URL(path, baseUrl);
    url.searchParams.set("_deploy_check", String(Date.now()));
    let lastError = "";
    for (let attempt = 1; attempt <= 24; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          redirect: "follow",
          headers: { "cache-control": "no-cache" },
        });
        const contentType = response.headers.get("content-type") ?? "";
        const body = await response.text();
        if (
          response.ok &&
          contentType.includes("text/html") &&
          /<html[\s>]/i.test(body)
        ) {
          lastError = "";
          break;
        }
        lastError = `${response.status} ${contentType}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt < 24) await delay(15_000);
    }
    if (lastError) {
      throw new Error(
        `smoke check failed for ${url.pathname}: ${lastError}`,
      );
    }
  }
}

if (process.argv[1]?.endsWith("smoke.ts")) {
  const { values } = parseArgs({
    options: {
      "base-url": { type: "string" },
      path: { type: "string", multiple: true, default: ["/"] },
    },
  });
  if (!values["base-url"]) throw new Error("--base-url is required");
  await smoke(values["base-url"], values.path ?? ["/"]);
}
