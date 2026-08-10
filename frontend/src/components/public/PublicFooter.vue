<template>
  <footer class="public-footer">
    <div class="container">
      <p class="public-footer__text">
        &copy; {{ currentYear }} PersonaFlow. All rights reserved.
      </p>
      <div class="public-footer__links">
        <a href="https://github.com" target="_blank" rel="noopener" class="footer-link">GitHub</a>
        <span class="footer-separator">·</span>
        <a href="mailto:hello@example.com" class="footer-link">Contact</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.public-footer {
  background: var(--public-surface);
  border-top: 1px solid var(--public-border);
  padding: 1.5rem 0;
  margin-top: auto;
}

.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.public-footer__text {
  color: var(--public-text-muted);
  font-size: var(--public-font-size-xs);
  margin: 0;
}

.public-footer__links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-link {
  color: var(--public-text-secondary);
  font-size: var(--public-font-size-xs);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--public-accent);
}

.footer-separator {
  color: var(--public-text-muted);
}

@media (max-width: 640px) {
  .container {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}
</style>