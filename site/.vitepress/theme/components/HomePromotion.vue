<script setup lang="ts">
import {
  HOME_ADVANTAGES,
  HOME_SERVICES,
  OFFICIAL_ACTIONS,
} from "../../../../src/official-site.js";
</script>

<template>
  <section
    class="riyi-home-promotion"
    aria-labelledby="riyi-services-title"
  >
    <div class="riyi-content-shell">
      <header class="riyi-promotion-intro">
        <p class="riyi-eyebrow">从找房到安居</p>
        <h2 id="riyi-services-title">看懂选择，再决定下一步</h2>
        <p>
          日宜把日本房产服务与实用内容放在同一个官网里。你可以先了解流程、区域与生活条件，也可以直接开始找房。
        </p>
      </header>

      <div class="riyi-service-grid">
        <article
          v-for="(service, index) in HOME_SERVICES"
          :key="service.title"
          class="riyi-service-card"
        >
          <span class="riyi-service-index" aria-hidden="true">
            {{ String(index + 1).padStart(2, "0") }}
          </span>
          <h3>{{ service.title }}</h3>
          <p>{{ service.description }}</p>
          <a :href="service.link" class="riyi-text-link">
            {{ service.linkLabel }}
            <span aria-hidden="true">→</span>
          </a>
        </article>
      </div>

      <section
        class="riyi-advantages"
        aria-labelledby="riyi-advantages-title"
      >
        <div class="riyi-advantages-heading">
          <p class="riyi-eyebrow">日宜的方式</p>
          <h2 id="riyi-advantages-title">让找房信息更直观、更清楚</h2>
          <p>
            房子不是一串参数。我们希望把空间、位置和真实生活条件一起说明，降低比较与沟通成本。
          </p>
        </div>

        <div class="riyi-advantage-grid">
          <article
            v-for="advantage in HOME_ADVANTAGES"
            :key="advantage.title"
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
          <p class="riyi-eyebrow">准备开始找房？</p>
          <h2>把你的计划告诉日宜</h2>
          <p>先浏览房源，或直接说明预算、区域与入住时间。</p>
        </div>
        <div class="riyi-action-list">
          <a
            v-for="action in OFFICIAL_ACTIONS"
            :key="action.label"
            :class="[
              'riyi-action-link',
              `riyi-action-link--${action.tone}`,
            ]"
            :href="action.href"
            target="_blank"
            rel="noreferrer"
          >
            <span>{{ action.label }}</span>
            <small>{{ action.description }}</small>
          </a>
        </div>
      </aside>
    </div>
  </section>
</template>
