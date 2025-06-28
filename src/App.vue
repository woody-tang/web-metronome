<script setup lang="ts">
import Metronome from './views/Metronome.vue'
</script>

<template>
  <div class="q-pa-md">
    <Metronome />
  </div>
</template>

<style>
html,
body {
  touch-action: manipulation;
  /* 禁用双指缩放 */
  overscroll-behavior: contain;
  /* 阻止下拉刷新导致的缩放 */
  width: 100%;
  height: 100%;
  overflow: auto;
  -webkit-text-size-adjust: 100%;
  /* 禁止字体自动缩放 */
}

/* .logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
} */
</style>
