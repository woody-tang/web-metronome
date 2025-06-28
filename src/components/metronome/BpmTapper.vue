<template>
    <div class="bpm-tapper">
        <q-btn @click="handleTap" :class="{ 'active': isTapping }" class="tap-button" :label="tapCount === 0 ? '开始点击测速' : '继续点击'"/>

            <div v-if="tapCount > 1" class="bpm-result">
                <div class="bpm-value">{{ currentBpm }}</div>
                <div class="bpm-label">BPM</div>
                <div class="tap-count">点击次数: {{ tapCount }}</div>
            </div>

            <div class="visual-feedback" :style="{ opacity: feedbackOpacity }"></div>

            <button v-if="tapCount > 0" @click="reset" class="reset-button">
                重置
            </button>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const tapTimes = ref([]);
const tapCount = ref(0);
const currentBpm = ref(0);
const isTapping = ref(false);
const feedbackOpacity = ref(0);
const maxRecords = 8; // 记录最近8次点击

const handleTap = () => {
    isTapping.value = true;
    const now = Date.now();
    tapTimes.value.push(now);

    // 限制记录数量
    if (tapTimes.value.length > maxRecords) {
        tapTimes.value.shift();
    }

    tapCount.value = tapTimes.value.length;

    // 提供视觉反馈
    feedbackOpacity.value = 1;
    setTimeout(() => feedbackOpacity.value = 0, 100);

    // 计算BPM需要至少2次点击
    if (tapTimes.value.length >= 2) {
        calculateBpm();
    }

    // 3秒无操作自动重置
    resetTimer();
};

let resetTimeout;
const resetTimer = () => {
    clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
        if (tapCount.value > 0) {
            reset();
        }
    }, 3000);
};

const calculateBpm = () => {
    const intervals = [];

    for (let i = 1; i < tapTimes.value.length; i++) {
        intervals.push(tapTimes.value[i] - tapTimes.value[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    currentBpm.value = Math.round(60000 / avgInterval);
};

const reset = () => {
    tapTimes.value = [];
    tapCount.value = 0;
    currentBpm.value = 0;
    isTapping.value = false;
    clearTimeout(resetTimeout);
};

// 自动重置监听
watch(tapCount, (newVal) => {
    if (newVal === 0) {
        reset();
    }
});
</script>

<style scoped>
.bpm-tapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 30px;
    background: #f5f5f5;
    border-radius: 12px;
    max-width: 300px;
    margin: 0 auto;
}

.tap-button {
    padding: 20px 40px;
    font-size: 1.2rem;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
}

.tap-button.active {
    background-color: #3aa876;
    transform: scale(0.98);
}

.bpm-result {
    text-align: center;
    margin: 15px 0;
}

.bpm-value {
    font-size: 3rem;
    font-weight: bold;
    color: #333;
}

.bpm-label {
    font-size: 1.2rem;
    color: #666;
    margin-top: -10px;
}

.tap-count {
    font-size: 0.9rem;
    color: #888;
    margin-top: 5px;
}

.visual-feedback {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: rgba(66, 185, 131, 0.3);
    position: absolute;
    transition: opacity 0.3s;
    pointer-events: none;
}

.reset-button {
    padding: 8px 16px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
}
</style>