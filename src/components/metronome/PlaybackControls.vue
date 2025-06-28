<template>
  <div class="playback-controls">
    <q-btn id='toggleBtn' rounded :size="isDesktop() ? 'lg' : 'md'" :color="isPlaying ? 'negative' : 'positive'"
      :icon="isPlaying ? mdiStop : mdiPlay" :label="isPlaying ? '结束' : '开始'" @click="$emit('toggle-play')" />
    <!-- TODO: 播放状态分播放、暂停、结束 -->
    <q-btn rounded :size="isDesktop() ? 'lg' : 'md'" icon="stop" label="结束" color="negative" v-if="false" />
    <!-- <q-btn rounded :size="isDesktop() ? 'lg' : 'md'" icon="refresh" label="重置" color="amber" v-if="false"
      @click="$emit('reset-metronome')" /> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { mdiStop, mdiPlay } from '@quasar/extras/mdi-v6'
import { isDesktop } from '../../utils/device-type-test.ts'
defineProps({
  isPlaying: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['toggle-play']);

const handleInputKeydown = (event: KeyboardEvent) => {
  // 只处理特定按键
  if (event.key === ' ') {
    // 创建并触发自定义事件
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    document.getElementById('toggleBtn')?.dispatchEvent(event);
  }
};

onMounted(() => {
  if (isDesktop())
    document.addEventListener('keydown', handleInputKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleInputKeydown);
});
</script>

<style scoped>
.playback-controls {
  display: flex;
  justify-content: center;
  gap: 0px 10px;
  flex-wrap: wrap;
}
</style>