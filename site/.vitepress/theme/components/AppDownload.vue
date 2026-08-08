<script setup lang="ts">
import { TkIcon, TkMessage } from "vitepress-theme-teek";
import { ref } from "vue";
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

<template>
  <section
    id="download-app"
    class="riyi-app-download"
    aria-labelledby="riyi-app-download-title"
  >
    <div class="riyi-app-download__copy">
      <p class="riyi-eyebrow">随时随地找房</p>
      <h2 id="riyi-app-download-title">下载日宜找房 App</h2>
      <p>
        浏览日本房源、短视频看房和区域信息，也可以直接使用微信小程序。
      </p>
    </div>

    <div class="riyi-app-download__actions">
      <template
        v-for="action in APP_DOWNLOAD_ACTIONS"
        :key="action.id"
      >
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

      <p
        v-if="showManualCopy"
        class="riyi-mini-program-token"
        role="status"
      >
        请手动复制：<code>{{ APP_DOWNLOAD_LINKS.wechatMiniProgram }}</code>
      </p>
    </div>
  </section>
</template>
