<script setup lang="ts">
import { computed } from "vue";
import {
  selectVisibleActions,
  selectVisibleAdvantages,
  selectVisibleServices,
} from "../../../../src/official-site.js";
import { useRiyiContent } from "../use-riyi-content.js";
import AppDownload from "./AppDownload.vue";

const content = useRiyiContent();
const home = computed(() => content.value.home);
const services = computed(() => selectVisibleServices(home.value.services));
const advantages = computed(() =>
  selectVisibleAdvantages(home.value.advantages),
);
const actions = computed(() => selectVisibleActions(home.value.actions));
</script>

<template>
  <section class="riyi-home-promotion" aria-labelledby="riyi-services-title">
    <div class="riyi-content-shell">
      <AppDownload v-if="home.appDownload.enabled" :config="home.appDownload" />

      <header class="riyi-promotion-intro">
        <p class="riyi-eyebrow">{{ home.services.eyebrow }}</p>
        <h2 id="riyi-services-title">{{ home.services.title }}</h2>
        <p>{{ home.services.description }}</p>
      </header>

      <div class="riyi-service-grid">
        <article
          v-for="(service, index) in services"
          :key="service.id"
          class="riyi-service-card"
        >
          <img
            v-if="service.image"
            class="riyi-service-card__image"
            :src="service.image"
            :alt="service.imageAlt"
          />
          <span class="riyi-service-index" aria-hidden="true">
            {{ String(index + 1).padStart(2, "0") }}
          </span>
          <h3>{{ service.title }}</h3>
          <p>{{ service.description }}</p>
          <a
            :href="service.href"
            class="riyi-text-link"
            :target="service.external ? '_blank' : undefined"
            :rel="service.external ? 'noreferrer' : undefined"
          >
            {{ service.linkLabel }}
            <span aria-hidden="true">→</span>
          </a>
        </article>
      </div>

      <section
        v-if="home.advantages.enabled"
        class="riyi-advantages"
        aria-labelledby="riyi-advantages-title"
      >
        <div class="riyi-advantages-heading">
          <p class="riyi-eyebrow">{{ home.advantages.eyebrow }}</p>
          <h2 id="riyi-advantages-title">
            {{ home.advantages.title }}
          </h2>
          <p>{{ home.advantages.description }}</p>
        </div>

        <div class="riyi-advantage-grid">
          <article
            v-for="advantage in advantages"
            :key="advantage.id"
            class="riyi-advantage-card"
          >
            <span class="riyi-check" aria-hidden="true">✓</span>
            <div>
              <h3>{{ advantage.title }}</h3>
              <p>{{ advantage.description }}</p>
            </div>
          </article>
        </div>
      </section>

      <aside class="riyi-action-panel" aria-label="日宜房产服务入口">
        <div class="riyi-action-copy">
          <p class="riyi-eyebrow">{{ home.actions.eyebrow }}</p>
          <h2>{{ home.actions.title }}</h2>
          <p>{{ home.actions.description }}</p>
        </div>
        <div class="riyi-action-list">
          <a
            v-for="action in actions"
            :key="action.id"
            :class="['riyi-action-link', `riyi-action-link--${action.tone}`]"
            :href="action.href"
            :target="action.external ? '_blank' : undefined"
            :rel="action.external ? 'noreferrer' : undefined"
          >
            <span>{{ action.label }}</span>
            <small>{{ action.description }}</small>
          </a>
        </div>
      </aside>
    </div>
  </section>
</template>
