<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import {
  OFFICIAL_ACTIONS,
  shouldShowArticleCta,
} from "../../../../src/official-site.js";

const { frontmatter } = useData();
const isArticle = computed(() => shouldShowArticleCta(frontmatter.value));
</script>

<template>
  <aside
    v-if="isArticle"
    class="riyi-article-cta"
    aria-labelledby="riyi-article-cta-title"
  >
    <div>
      <p class="riyi-eyebrow">需要进一步找房？</p>
      <h2 id="riyi-article-cta-title">从文章继续到你的实际需求</h2>
      <p>查看当前房源，或把预算、区域和入住计划告诉日宜。</p>
    </div>
    <div class="riyi-article-cta__actions">
      <a
        v-for="action in OFFICIAL_ACTIONS"
        :key="action.label"
        :class="[
          'riyi-article-cta__link',
          `riyi-article-cta__link--${action.tone}`,
        ]"
        :href="action.href"
        target="_blank"
        rel="noreferrer"
      >
        {{ action.label }}
      </a>
    </div>
  </aside>
</template>
