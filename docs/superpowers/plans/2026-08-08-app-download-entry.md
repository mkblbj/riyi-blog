# App Download Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Teek-native homepage download section for App Store, Google Play, and the WeChat mini program.

**Architecture:** Keep all channel URLs and display metadata in TypeScript modules, render an isolated Vue component inside the existing `teek-home-banner-after` content chain, and reuse Teek `TkIcon` and `TkMessage` primitives. Keep clipboard behavior in a pure helper so success and fallback states can be tested without mounting Vue.

**Tech Stack:** VitePress 1.6.4, vitepress-theme-teek 1.6.2, Vue 3.5, TypeScript 6, Vitest 3, CSS.

## Global Constraints

- Do not add a backend, database, cloud service, or second UI framework.
- Do not switch away from the current `teekHome: true` blog homepage.
- Do not display decorative or non-scannable QR codes.
- App Store and Google Play must remain ordinary usable links when JavaScript is unavailable.
- The WeChat token is exactly `#小程序://日宜找房/eFzVt03INd0YNma`.
- Clipboard failure must not claim success; it must expose the full token for manual copying.
- Desktop and mobile layouts must support light mode, dark mode, keyboard focus, and reduced motion.

---

### Task 1: Download channel contract and clipboard result

**Files:**
- Modify: `src/platform-links.ts`
- Modify: `src/official-site.ts`
- Create: `src/clipboard.ts`
- Create: `tests/app-download.test.ts`

**Interfaces:**
- Produces: `APP_DOWNLOAD_LINKS` with `appStore`, `googlePlay`, and `wechatMiniProgram` string values.
- Produces: `APP_DOWNLOAD_ACTIONS: readonly AppDownloadAction[]` where each action has `id`, `label`, `description`, `kind`, and `iconUrl` plus either an HTTP `href` or the mini-program token.
- Produces: `copyText(text, clipboard): Promise<"copied" | "manual">`.

- [ ] **Step 1: Write the failing data and clipboard tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { copyText } from "../src/clipboard.js";
import { APP_DOWNLOAD_ACTIONS } from "../src/official-site.js";
import { APP_DOWNLOAD_LINKS } from "../src/platform-links.js";

describe("app download entry", () => {
  it("publishes the approved native app and mini-program channels", () => {
    expect(APP_DOWNLOAD_LINKS).toEqual({
      appStore:
        "https://apps.apple.com/jp/app/%E6%97%A5%E5%AE%9C%E6%89%BE%E6%88%BF/id6756088611",
      googlePlay:
        "https://play.google.com/store/apps/details?id=com.rykj.riyizhaofang",
      wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma",
    });
    expect(APP_DOWNLOAD_ACTIONS.map(({ id }) => id)).toEqual([
      "app-store",
      "google-play",
      "wechat-mini-program",
    ]);
  });

  it("reports copied only after the clipboard accepts the token", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyText("token", { writeText })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("token");
  });

  it("falls back to manual copy when clipboard is unavailable or rejects", async () => {
    await expect(copyText("token", undefined)).resolves.toBe("manual");
    await expect(
      copyText("token", { writeText: vi.fn().mockRejectedValue(new Error("denied")) }),
    ).resolves.toBe("manual");
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing modules fail it**

Run: `pnpm vitest run tests/app-download.test.ts`

Expected: FAIL because `src/clipboard.ts` and the download exports do not exist.

- [ ] **Step 3: Implement the minimal contracts**

```ts
// src/clipboard.ts
export interface TextClipboard {
  writeText(text: string): Promise<void>;
}

export async function copyText(
  text: string,
  clipboard: TextClipboard | undefined,
): Promise<"copied" | "manual"> {
  if (!clipboard) return "manual";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "manual";
  }
}
```

Add `APP_DOWNLOAD_LINKS` to `src/platform-links.ts`. Add the typed `APP_DOWNLOAD_ACTIONS` array to `src/official-site.ts`, using HTTPS Simple Icons image URLs and `kind: "link" | "copy"` to distinguish navigation from clipboard behavior.

```ts
// src/platform-links.ts
export const APP_DOWNLOAD_LINKS = {
  appStore:
    "https://apps.apple.com/jp/app/%E6%97%A5%E5%AE%9C%E6%89%BE%E6%88%BF/id6756088611",
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.rykj.riyizhaofang",
  wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma",
} as const;

// src/official-site.ts
export interface AppDownloadAction {
  id: "app-store" | "google-play" | "wechat-mini-program";
  label: string;
  description: string;
  kind: "link" | "copy";
  value: string;
  iconUrl: string;
}

export const APP_DOWNLOAD_ACTIONS: readonly AppDownloadAction[] = [
  {
    id: "app-store",
    label: "App Store",
    description: "iPhone 版日宜找房",
    kind: "link",
    value: APP_DOWNLOAD_LINKS.appStore,
    iconUrl: "https://cdn.simpleicons.org/apple/111111",
  },
  {
    id: "google-play",
    label: "Google Play",
    description: "Android 版日宜找房",
    kind: "link",
    value: APP_DOWNLOAD_LINKS.googlePlay,
    iconUrl: "https://cdn.simpleicons.org/googleplay/34A853",
  },
  {
    id: "wechat-mini-program",
    label: "微信小程序",
    description: "复制口令后在微信打开",
    kind: "copy",
    value: APP_DOWNLOAD_LINKS.wechatMiniProgram,
    iconUrl: "https://cdn.simpleicons.org/wechat/07C160",
  },
] as const;
```

- [ ] **Step 4: Run focused tests and the existing official-site contract**

Run: `pnpm vitest run tests/app-download.test.ts tests/official-site.test.ts tests/site.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the data layer**

```bash
git add src/platform-links.ts src/official-site.ts src/clipboard.ts tests/app-download.test.ts
git commit -m "feat: define app download channels"
```

### Task 2: Teek download component and homepage rendering

**Files:**
- Create: `site/.vitepress/theme/components/AppDownload.vue`
- Modify: `site/.vitepress/theme/components/HomePromotion.vue`
- Modify: `tests/app-download.test.ts`

**Interfaces:**
- Consumes: `APP_DOWNLOAD_ACTIONS`, `APP_DOWNLOAD_LINKS`, and `copyText` from Task 1.
- Produces: the `#download-app` homepage section with native links, a copy button, Teek icons, Teek messages, and a manual-copy fallback.

- [ ] **Step 1: Add a failing component source contract**

```ts
it("renders the download component through the Teek homepage content slot", async () => {
  const component = await readFile(
    "site/.vitepress/theme/components/AppDownload.vue",
    "utf8",
  );
  const homepage = await readFile(
    "site/.vitepress/theme/components/HomePromotion.vue",
    "utf8",
  );

  expect(homepage).toContain("<AppDownload />");
  expect(component).toContain('id="download-app"');
  expect(component).toContain("TkIcon");
  expect(component).toContain("TkMessage");
  expect(component).toContain("APP_DOWNLOAD_ACTIONS");
  expect(component).toContain("APP_DOWNLOAD_LINKS.wechatMiniProgram");
  expect(component).toContain("copyText");
  expect(component).toContain('target="_blank"');
});
```

- [ ] **Step 2: Run the focused test and verify the missing component fails it**

Run: `pnpm vitest run tests/app-download.test.ts`

Expected: FAIL with `ENOENT` for `AppDownload.vue`.

- [ ] **Step 3: Implement `AppDownload.vue` and mount it before services**

The component must:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TkIcon, TkMessage } from "vitepress-theme-teek";
import { copyText } from "../../../../src/clipboard.js";
import { APP_DOWNLOAD_ACTIONS } from "../../../../src/official-site.js";
import { APP_DOWNLOAD_LINKS } from "../../../../src/platform-links.js";

const showManualCopy = ref(false);

async function copyMiniProgramLink() {
  const result = await copyText(
    APP_DOWNLOAD_LINKS.wechatMiniProgram,
    typeof navigator === "undefined" ? undefined : navigator.clipboard,
  );
  showManualCopy.value = result === "manual";
  if (result === "copied") {
    TkMessage.success("已复制，请粘贴到微信打开");
  } else {
    TkMessage.warning("自动复制失败，请手动复制下方口令");
  }
}
</script>
```

Render link actions as `<a target="_blank" rel="noreferrer">`; render the mini-program action as `<button type="button">`. Use `<TkIcon icon-type="img">` for all three icons and render a selectable `<code>` block only when `showManualCopy` is true. Import and render `<AppDownload />` as the first child inside `.riyi-content-shell` in `HomePromotion.vue`.

```vue
<template>
  <section
    id="download-app"
    class="riyi-app-download"
    aria-labelledby="riyi-app-download-title"
  >
    <div class="riyi-app-download__copy">
      <p class="riyi-eyebrow">随时随地找房</p>
      <h2 id="riyi-app-download-title">下载日宜找房 App</h2>
      <p>浏览日本房源、短视频看房和区域信息，也可以直接使用微信小程序。</p>
    </div>
    <div class="riyi-app-download__actions">
      <template v-for="action in APP_DOWNLOAD_ACTIONS" :key="action.id">
        <a
          v-if="action.kind === 'link'"
          class="riyi-download-action"
          :href="action.value"
          target="_blank"
          rel="noreferrer"
        >
          <TkIcon
            :icon="action.iconUrl"
            icon-type="img"
            :img-alt="action.label"
            size="1.7rem"
          />
          <span>
            <strong>{{ action.label }}</strong>
            <small>{{ action.description }}</small>
          </span>
        </a>
        <button
          v-else
          type="button"
          class="riyi-download-action"
          @click="copyMiniProgramLink"
        >
          <TkIcon
            :icon="action.iconUrl"
            icon-type="img"
            :img-alt="action.label"
            size="1.7rem"
          />
          <span>
            <strong>{{ action.label }}</strong>
            <small>{{ action.description }}</small>
          </span>
        </button>
      </template>
      <p v-if="showManualCopy" class="riyi-mini-program-token" role="status">
        请手动复制：<code>{{ APP_DOWNLOAD_LINKS.wechatMiniProgram }}</code>
      </p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run the component and data tests**

Run: `pnpm vitest run tests/app-download.test.ts tests/official-site.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the component**

```bash
git add site/.vitepress/theme/components/AppDownload.vue site/.vitepress/theme/components/HomePromotion.vue tests/app-download.test.ts
git commit -m "feat: add Teek app download section"
```

### Task 3: Responsive branded styling

**Files:**
- Modify: `site/.vitepress/theme/custom.css`
- Modify: `tests/official-css.test.ts`

**Interfaces:**
- Consumes: `.riyi-app-download`, `.riyi-app-download__actions`, `.riyi-download-action`, and `.riyi-mini-program-token` classes from Task 2.
- Produces: responsive light/dark styling with focus and reduced-motion affordances.

- [ ] **Step 1: Add failing CSS assertions**

```ts
for (const selector of [
  ".riyi-app-download",
  ".riyi-app-download__actions",
  ".riyi-download-action",
  ".riyi-mini-program-token",
]) {
  expect(css).toContain(selector);
}
expect(css).toMatch(/\.riyi-download-action[^\n]*:focus-visible/);
```

Also add `.riyi-download-action` to the reduced-motion selector assertion.

- [ ] **Step 2: Run the CSS test and verify the missing styles fail it**

Run: `pnpm vitest run tests/official-css.test.ts`

Expected: FAIL because the download selectors are absent.

- [ ] **Step 3: Add minimal responsive CSS**

Add a two-column brand panel with a three-column action grid on desktop, collapse the panel at `960px`, and collapse actions to one column at `767px`. Use `var(--riyi-forest)`, `var(--riyi-mint)`, existing surface variables, and existing focus color `#6dc2aa`. Give anchors and buttons the same card dimensions and reset button typography/background defaults. Include `.riyi-download-action` in hover and reduced-motion rules.

```css
.riyi-app-download {
  position: relative;
  display: grid;
  overflow: hidden;
  grid-template-columns: minmax(15rem, 0.8fr) minmax(0, 1.4fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: center;
  margin-bottom: clamp(4.5rem, 8vw, 7rem);
  padding: clamp(2rem, 5vw, 4rem);
  border-radius: 1.75rem;
  background: var(--riyi-forest);
  box-shadow: 0 28px 70px rgba(16, 42, 37, 0.22);
  color: #ffffff;
}

.riyi-app-download__copy h2 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(1.75rem, 3.2vw, 2.7rem);
  line-height: 1.25;
}

.riyi-app-download__copy > p:last-child {
  margin: 0.85rem 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}

.riyi-app-download__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.riyi-download-action {
  display: flex;
  min-height: 6.5rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-decoration: none;
  transition: transform 180ms ease, background-color 180ms ease;
}

.riyi-download-action > span {
  display: flex;
  flex-direction: column;
  margin-left: 0.8rem;
}

.riyi-download-action strong {
  font-size: 0.95rem;
}

.riyi-download-action small {
  margin-top: 0.3rem;
  color: inherit;
  font-size: 0.72rem;
  line-height: 1.45;
  opacity: 0.68;
}

.riyi-mini-program-token {
  grid-column: 1 / -1;
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.8rem;
}

.riyi-mini-program-token code {
  user-select: all;
}

.riyi-download-action:focus-visible {
  outline: 3px solid #6dc2aa;
  outline-offset: 3px;
}

@media (max-width: 960px) {
  .riyi-app-download {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .riyi-app-download {
    margin-bottom: 3.75rem;
    padding: 1.5rem;
    border-radius: 1.25rem;
  }

  .riyi-app-download__actions {
    grid-template-columns: 1fr;
  }
}

@media (hover: hover) {
  .riyi-download-action:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .riyi-download-action {
    transition: none;
  }

  .riyi-download-action:hover {
    transform: none;
  }
}
```

- [ ] **Step 4: Run CSS and component tests**

Run: `pnpm vitest run tests/official-css.test.ts tests/app-download.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the styling**

```bash
git add site/.vitepress/theme/custom.css tests/official-css.test.ts
git commit -m "style: integrate download entry with Teek"
```

### Task 4: Full verification, visual acceptance, push, and production deploy

**Files:**
- Verify only unless acceptance finds a defect.

**Interfaces:**
- Consumes: the complete homepage download feature.
- Produces: a verified commit on `main` and a successful production deployment.

- [ ] **Step 1: Run the complete local release gate**

Run: `pnpm exec tsc --noEmit && pnpm check && git diff --check && git status --short`

Expected: TypeScript exits 0, all Vitest tests pass, VitePress builds, build verification passes, and the worktree is clean after committed changes.

- [ ] **Step 2: Preview desktop and mobile behavior**

Run: `pnpm preview --host 127.0.0.1`

Check the homepage at desktop width and 390px width. Verify all three channels are visible, external links have the expected destination, the mini-program button reports success when clipboard works, manual token appears when clipboard is unavailable, dark mode is legible, and no layout overlaps the post list.

- [ ] **Step 3: Push `main` without force**

```bash
git fetch origin main
git rebase origin/main
git push origin main
```

- [ ] **Step 4: Monitor the production workflow**

Find the workflow run whose `headSha` equals `git rev-parse HEAD`, then run `gh run watch <run-id> --exit-status`. Expected: both `build` and `deploy` jobs conclude `success`.

- [ ] **Step 5: Verify production content**

Fetch `https://www.riyihome.com/` with a cache-busting query and verify HTTP 200 plus the markers `下载日宜找房 App`, `App Store`, `Google Play`, and `微信小程序`. Run the production smoke script for `/` and confirm local `HEAD` equals `origin/main`.
