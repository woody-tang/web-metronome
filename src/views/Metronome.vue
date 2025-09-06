<template>

    <div class="metronome-container shadow-3">
        <div class="title"><span>🎸Woody在线节拍器🥁</span></div>
        <div>
            <q-item class="q-pl-lg">
                <q-item-section avatar @click="handleToggleMute">
                    <q-icon v-if="metronome.volume >= 66 && !metronome.isMuted" color="teal" :name="mdiVolumeHigh" />
                    <q-icon v-else-if="metronome.volume >= 33 && metronome.volume < 66 && !metronome.isMuted"
                        color="teal" :name="mdiVolumeMedium" />
                    <q-icon v-else-if="metronome.volume > 0 && metronome.volume < 33 && !metronome.isMuted" color="teal"
                        :name="mdiVolumeLow" />
                    <q-icon v-else-if="metronome.volume == 0 || metronome.isMuted" color="teal" :name="mdiVolumeOff" />

                </q-item-section>
                <q-item-section style="margin-left: -25px; margin-right: 20px;">
                    <q-slider v-model="metronome.volume" :min="0" :max="100" color="teal" label switch-label-side />
                </q-item-section>
            </q-item>
        </div>
        <BpmControl :bpm="metronome.bpm" :maxBpm="BPM_CONSTS.max" :minBpm='BPM_CONSTS.min'
            @update:bpm="handleBpmChange" />


        <BeatIndicator :current-main-beat="metronome.mainBeat" :current-sub-beat="metronome.subBeat"
            :time-signature="metronome.timeSignature" :current-pattern="currentSubDevisionPattern"
            :emphasize-first-beat="metronome.stressFirstBeat"
            :emphasize-first-sub-beat="metronome.stressFirstSubBeat" />

        <TimeSignature :time-signature="metronome.timeSignature" @update:time-signature="handleTimeSignatureChange"
            :sub-division-type="metronome.subdivision" @update:sub-division-type="handleSubDivisionTpyeChange"
            :timbre-preset-type="metronome.timbre" @update:timbre-preset-type="handleTimbrePresetTypeChange"
            :stress-first-beat="metronome.stressFirstBeat" @update:stress-first-beat="handleStressFirstBeatChange"
            :stress-first-sub-beat="metronome.stressFirstSubBeat"
            @update:stress-first-sub-beat="handleStressFirstSubBeatChange" />

        <PlaybackControls :is-playing="metronome.isPlaying" @toggle-play="handleTogglePlay"
            @reset-metronome="handleRest" />
    </div>
    <div style="flex-direction: column;display: flex; align-items: center; padding: 30px;">
        <span style="font-size: large; font-weight: bold;">->更多内容正在赶来...</span>
    </div>

</template>

<script setup lang="ts">

import { Metronome, BPM_CONSTS, SUBDIVISION_TYPES } from '../utils/MetronomeEngine.ts'
import { mdiVolumeHigh, mdiVolumeMedium, mdiVolumeLow, mdiVolumeOff } from '@quasar/extras/mdi-v6'

import type { SubdivisionType } from '../utils/MetronomeEngine.ts'

import { reactive, onUnmounted, computed, watch } from 'vue'
import BpmControl from '../components/metronome/BpmControl.vue'
import TimeSignature from '../components/metronome/TimeSignature.vue'
import PlaybackControls from '../components/metronome/PlaybackControls.vue'
import BeatIndicator from '../components/metronome/BeatIndicator.vue'


const currentSubDevisionPattern = computed(() => { //计算节奏型时间列表
    const pat = SUBDIVISION_TYPES.find(item => item.name === metronome.subdivision)
    if (pat)
        return pat.pattern;
    else
        return [1]; //四分
}
);
const savedMetronomeState = localStorage.getItem('metronomeState');
const metronome = reactive(new Metronome(savedMetronomeState ? savedMetronomeState : undefined));

let saveTimeout: number;//防抖计时器id
const relevantProps = computed(() => (metronome.getCurrentMetronomeState(true) as string));

watch(relevantProps, (newState) => {
    // 防抖保存
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        // console.log(newState);
        localStorage.setItem('metronomeState', newState);
    }, 500); // 500ms内只保存一次
}, { deep: true });

//TODO:修改成这种方式更新参数，免去创建多个函数的麻烦
// type ChangeabelConfig = 'timeSignature';
// function handleConfigUpdate(payload: { key: ChangeabelConfig, value: any }) {
//     metronome[payload.key] = payload.value;
//     console.log(payload);

// }
// 处理BPM变化
function handleBpmChange(newBpm: number) {
    metronome.bpm = newBpm;
    //#TODO 配置修改设置后保持连续性
}
function handleTimeSignatureChange(v: number) {
    metronome.timeSignature = v;
}
function handleSubDivisionTpyeChange(newType: SubdivisionType) {
    metronome.subdivision = newType;
}

function handleTimbrePresetTypeChange(newSoundId: string) {
    metronome.timbre = newSoundId;
}
function handleStressFirstBeatChange(v: boolean) {
    metronome.stressFirstBeat = v;
}
function handleStressFirstSubBeatChange(v: boolean) {
    metronome.stressFirstSubBeat = v;
}

function handleTogglePlay() {
    if (!metronome.isPlaying)
        metronome.start();
    else
        metronome.stop()
}

function handleToggleMute() {
    if (!metronome.isMuted)
        metronome.mute();
    else
        metronome.unMute();
}

function handleRest() {
    metronome.bpm = 68;
    metronome.timeSignature = 4;
    metronome.subdivision = SUBDIVISION_TYPES[0].name;//四分
    metronome.stressFirstBeat = true;
    metronome.stressFirstSubBeat = true;
    metronome.start();
}

// 组件卸载时清理定时器
onUnmounted(() => {
    metronome.dispose()
})
</script>

<style scoped>
.metronome-container {
    max-width: 1000px;
    min-width: 350px;
    margin: 0 auto;
    padding: 20px;
    border-radius: 40px;
}

.title {
    font-size: 1.8rem;
    font-weight: 1000;
    text-align: center;
    margin-bottom: 10px;
    border-radius: 10px;
}
</style>