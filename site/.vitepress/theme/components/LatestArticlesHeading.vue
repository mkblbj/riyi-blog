<script setup lang="ts">
import { computed } from "vue";
import { useRiyiContent } from "../use-riyi-content.js";

const content = useRiyiContent();
const articles = computed(() => content.value.home.articles);
</script>

<template>
  <header class="riyi-section-heading">
    <p class="riyi-eyebrow">{{ articles.eyebrow }}</p>
    <h2>{{ articles.title }}</h2>
    <p>{{ articles.description }}</p>
  </header>
</template>
