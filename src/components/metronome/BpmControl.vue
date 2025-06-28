<template>
    <div class="bpm-control shadow-10">
        <div class="column items-center q-mb-sm" @click="clickBpm">
            <div class="row justify-center items-end ">
                <text class="bpm-head-text">{{ bpm }}</text>
                <div class='column items-center'>
                    <text v-if="tapCount" class="tap-times">{{ `combo ${tapCount}` }}</text>
                    <q-btn flat round :icon="mdiGestureDoubleTap" @click.stop="handleTap" id="tapBtn">
                        <q-tooltip v-if='isDesktop()'>
                            点击测速(T)
                        </q-tooltip>
                    </q-btn>

                    <text class="bpm-text">BPM</text>
                </div>
            </div>
            <div class="tempo-label">{{ tempoLabel }}</div>
        </div>

        <div class="row items-center no-wrap q-pb-sm">
            <q-btn round :icon="mdiMinusThick" color='primary' @click="decreaseBpm" class="q-mr-lg"
                :disable="bpm <= minBpm" />
            <q-slider v-model="localBpm" :min="props.minBpm" :max="props.maxBpm" :step="1" track-size="6px"
                thumb-size="30px" color="primary" @update:model-value="updateBpm" label switch-label-side />
            <q-btn round :icon="mdiPlusThick" color='primary' @click="increaseBpm" class="q-ml-lg"
                :disable="bpm >= maxBpm" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { mdiGestureDoubleTap, mdiMinusThick, mdiPlusThick } from '@quasar/extras/mdi-v6'
import { isDesktop } from '../../utils/device-type-test.ts'

const props = defineProps({
    bpm: {
        type: Number,
        required: true
    },
    maxBpm: {
        type: Number,
        required: true
    },
    minBpm: {
        type: Number,
        required: true
    },
    stepSize: {
        type: Number,
        default: 5
    }
})

const emit = defineEmits(['update:bpm'])
const localBpm = ref(props.bpm)
// 点击bpm用到的变量
const tapTimes = ref<number[]>([]);
const tapCount = ref(0);
const maxRecords = 8; // 记录最近8次点击

watch(() => props.bpm, (newVal) => {
    localBpm.value = newVal
}, { immediate: true })

const tempoLabel = computed(() => {
    const bpm = localBpm.value;
    if (bpm >= 10 && bpm < 20) return '极端缓慢 (Larghissimo)';
    if (bpm >= 20 && bpm < 41) return '沉重板 (Grave)';
    if (bpm >= 41 && bpm < 46) return '缓板 (Lento)';
    if (bpm >= 46 && bpm < 51) return '最缓板 (Largo)';
    if (bpm >= 51 && bpm < 56) return '甚缓板 (Larghetto)';
    if (bpm >= 56 && bpm < 66) return '柔板 (Adagio)';
    if (bpm >= 66 && bpm < 70) return '颇慢板 (Adagietto)';
    if (bpm >= 70 && bpm < 73) return '中慢板 (Andante moderato)';
    if (bpm >= 73 && bpm < 78) return '行板 (Andante)';
    if (bpm >= 78 && bpm < 84) return '稍快行板 (Andantino)';
    if (bpm >= 84 && bpm < 86) return '行进中板 (Marcia moderato)';
    if (bpm >= 86 && bpm < 98) return '中板 (Moderato)';
    if (bpm >= 98 && bpm < 110) return '稍快板 (Allegretto)';
    if (bpm >= 110 && bpm < 133) return '快板 (Allegro)';
    if (bpm >= 133 && bpm < 141) return '活泼快板 (Vivace)';
    if (bpm >= 141 && bpm < 151) return '非常快板 (Vivacissimo)';
    if (bpm >= 151 && bpm < 168) return '极快板 (Allegrissimo)';
    if (bpm >= 168 && bpm < 178) return '急板 (Presto)';
    if (bpm >= 178 && bpm <= 500) return '最急板 (Prestissimo)';
    return '非常规速度';
})


function updateBpm(newBpm: number | null) {
    emit('update:bpm', newBpm)
}

function increaseBpm() {
    if (localBpm.value < props.maxBpm) {
        localBpm.value = Math.min(localBpm.value + props.stepSize, props.maxBpm)
        updateBpm(localBpm.value);
    }
}

function decreaseBpm() {
    if (localBpm.value > props.minBpm) {
        localBpm.value = Math.max(localBpm.value - props.stepSize, props.minBpm);
        updateBpm(localBpm.value);
    }
}

// 点击bpm相关逻辑
const handleTap = () => {
    const now = Date.now();
    tapTimes.value.push(now);

    // 限制记录数量
    if (tapTimes.value.length > maxRecords) {
        tapTimes.value.shift();
    }

    tapCount.value += 1;

    // 计算BPM需要至少2次点击
    if (tapTimes.value.length >= 2) {
        calculateBpm();
    }

    // 3秒无操作自动重置
    resetTimer();
};

let resetTimeout: number;
const resetTimer = () => {
    //相当于喂狗，3s不喂狗就自动清空
    clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
        if (tapTimes.value.length > 0) { // 列表里面有值就重置
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

    localBpm.value = Math.max(props.minBpm, Math.min(props.maxBpm, Math.round(60000 / avgInterval)))

    updateBpm(localBpm.value);

};

const reset = () => {
    tapTimes.value = [];
    tapCount.value = 0;
    clearTimeout(resetTimeout);
};

function clickBpm() { // 模拟点击bpm按钮
    // 创建并触发自定义事件
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    document.getElementById('tapBtn')?.dispatchEvent(event);
}

const handleInputKeydown = (e: KeyboardEvent) => {
    // 只处理特定按键
    if (e.key === 't' || e.key === 'T') {
        clickBpm();
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
.bpm-control {
    padding: 16px;
    background-color: #f5f5f5;
    border-radius: 18px;
}

.bpm-head-text {
    margin-right: 15px;
    margin-top: -30px;
    margin-bottom: -43px;
    font-size: 7rem;
    font-weight: 900;
    width: 200px;
    text-align: right;
    /* font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif */
}

.tap-times {
    width: 70px;
    text-wrap-mode: nowrap;
    text-align: center;
    /* background-color: antiquewhite; */
}

#tapBtn {
    margin-bottom: -4px;
}

.bpm-text {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: -5px;
    font-style: italic;
}

.tempo-label {
    margin-top: 20px;
    font-size: 0.875rem;
    color: #666;
    font-style: italic;
}

.bpm-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 8px;
}
</style>