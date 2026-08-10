import { useData } from "vitepress";
import { computed } from "vue";
import type { ResolvedSiteContent } from "../../../src/site-content.js";

export function useRiyiContent() {
  const { theme } = useData<{ riyi: ResolvedSiteContent }>();
  return computed(() => theme.value.riyi);
}
