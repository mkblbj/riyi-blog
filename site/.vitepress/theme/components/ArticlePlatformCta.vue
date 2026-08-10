<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import {
  selectVisibleActions,
  shouldShowArticleCta,
} from "../../../../src/official-site.js";
import { useRiyiContent } from "../use-riyi-content.js";

const { frontmatter } = useData();
const content = useRiyiContent();
const section = computed(() => content.value.home.actions);
const actions = computed(() => selectVisibleActions(section.value));
const isVisible = computed(
  () => shouldShowArticleCta(frontmatter.value) && actions.value.length > 0,
);
</script>

<template>
  <aside
    v-if="isVisible"
    class="riyi-article-cta"
    aria-labelledby="riyi-article-cta-title"
  >
    <div>
      <p class="riyi-eyebrow">{{ section.eyebrow }}</p>
      <h2 id="riyi-article-cta-title">{{ section.title }}</h2>
      <p>{{ section.description }}</p>
    </div>
    <div class="riyi-article-cta__actions">
      <a
        v-for="action in actions"
        :key="action.id"
        :class="[
          'riyi-article-cta__link',
          `riyi-article-cta__link--${action.tone}`,
        ]"
        :href="action.href"
        :target="action.external ? '_blank' : undefined"
        :rel="action.external ? 'noreferrer' : undefined"
      >
        {{ action.label }}
      </a>
    </div>
  </aside>
</template>
