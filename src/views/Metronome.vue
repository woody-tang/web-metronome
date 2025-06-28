<template>

    <div class="metronome-container shadow-3">
        <div class="title"><span>🎸Woody在线节拍器🥁</span></div>
        <div>
            <q-item class="q-pl-lg">
                <q-item-section avatar>
                    <q-icon color="teal" :name="mdiVolumeHigh" />
                </q-item-section>
                <q-item-section style="margin-left: -25px; margin-right: 20px;">
                    <q-slider v-model="metronomeVol" :min="0" :max="100" color="teal" label switch-label-side
                        @update:model-value="tickPlayer.volume = metronomeVol" />
                </q-item-section>
            </q-item>
        </div>
        <BpmControl :bpm="bpm" :maxBpm="BPM_CONSTS.max" :minBpm='BPM_CONSTS.min' @update:bpm="handleBpmChange" />


        <BeatIndicator :current-main-beat="currentMainBeat" :current-sub-beat="currentSubBeat"
            :time-signature="currentTimeSignature" :current-pattern="currentSubDevisionPattern"
            :emphasize-first-beat="stressFirstBeat" :emphasize-first-sub-beat="stressFirstSubBeat" />

        <TimeSignature :time-signature="currentTimeSignature" @update:time-signature="handleSignatureChange"
            :sub-division-type="currentSubDevision" @update:sub-division-type="handleSubDivisionTpyeChange"
            :timbre-preset-type="currentTimbrePreset" @update:timbre-preset-type="handleTimbrePresetTypeChange"
            v-model:stress-first-beat="stressFirstBeat" v-model:stress-first-sub-beat="stressFirstSubBeat" />

        <PlaybackControls :is-playing="isPlaying" @toggle-play="togglePlay" @reset-metronome="handleRest" />

    </div>



    <div style="flex-direction: column;display: flex; align-items: center; padding: 30px;">
        <span style="font-size: large; font-weight: bold;">->更多内容正在赶来...</span>
    </div>

</template>

<script setup lang="ts">
import { availableSoundIds, MetronomeSoundPlayer } from '../utils/MetronomeSoundPlayer.ts'
import { Metronome, BPM_CONSTS, SUBDIVISION_TYPES } from '../utils/MetronomeEngine.ts'
import { mdiVolumeHigh } from '@quasar/extras/mdi-v6'
import { clip } from '../utils/common-utils.ts'

import type { SubdivisionType, SubBeatEvent } from '../utils/MetronomeEngine.ts'

import { ref, watch, onUnmounted, computed } from 'vue'
import BpmControl from '../components/metronome/BpmControl.vue'
import TimeSignature from '../components/metronome/TimeSignature.vue'
import PlaybackControls from '../components/metronome/PlaybackControls.vue'
import BeatIndicator from '../components/metronome/BeatIndicator.vue'

// 节拍器的主要配置
const bpm = ref(68);
const currentTimeSignature = ref<number>(4);
const currentSubDevision = ref<SubdivisionType>(SUBDIVISION_TYPES[1].name);
const currentSubDevisionPattern = computed(() => {
    const pat = SUBDIVISION_TYPES.find(item => item.name === currentSubDevision.value)
    if (pat)
        return pat.pattern;
    else
        return [1]; //四分
}
);
const currentTimbrePreset = ref(availableSoundIds[4]);
const stressFirstBeat = ref(true);
const stressFirstSubBeat = ref(true);

// 拍子
const currentMainBeat = ref(0);
const currentSubBeat = ref(0);

// 音量
const metronomeVol = ref(65);

// #TODO 研究下怎么把这个里面的数据变成响应式还要求解耦
const metronome = new Metronome(onMetronomeBeat);
const tickPlayer = new MetronomeSoundPlayer(metronomeVol.value, currentTimbrePreset.value);


const isPlaying = ref(metronome.getIsPlaying());
// 开始节拍器（支持细分）
function startMetronome() {
    // 开始节拍器
    //#TODO: 统一规范，用set get方法还是抛出方法
    metronome.setBpm(bpm.value);
    tickPlayer.stressFirstBeat = stressFirstBeat.value;
    tickPlayer.stressFirstSubBeat = stressFirstSubBeat.value;
    metronome.setTimeSignature(currentTimeSignature.value);
    metronome.setSubdivision(currentSubDevision.value);
    metronome.start();
}

// 停止节拍器
function stopMetronome() {
    metronome.stop()
}

// 切换播放状态
function togglePlay() {
    isPlaying.value = !isPlaying.value
    if (isPlaying.value) {
        startMetronome();
    } else {
        stopMetronome();
    }
}

/**写法1
 * 监听emit事件
 * 在子组件中写@update:model-value，定义defineEmits，emit('update:time-signature', newValue)传值
 * 在父组件中@update:time-signature="handleSignatureChange"，回调；
 * 注意：父组件中不要使用v-model绑定
 */
// 处理BPM变化
function handleBpmChange(newBpm: number) {
    bpm.value = clip(newBpm, BPM_CONSTS.min, BPM_CONSTS.max)
    metronome.setBpm(bpm.value);
    //#TODO 配置修改设置后保持连续性
}
function handleSignatureChange(newSignature: number) {
    currentTimeSignature.value = newSignature;
    metronome.setTimeSignature(newSignature);
    //#TODO 配置修改设置后保持连续性
}
function handleSubDivisionTpyeChange(newType: SubdivisionType) {
    currentSubDevision.value = newType;
    metronome.setSubdivision(newType);
}
function handleTimbrePresetTypeChange(newSoundId: string) {
    currentTimbrePreset.value = newSoundId;
    tickPlayer.updateSound(newSoundId);
    // if (!presetPlayer.preLoaded) presetPlayer.init(); //TODO：为什么只有这个才有这个问题
    // if (newSoundId !== 'live-synth')
    //     presetPlayer.setSound(getSoundById(newSoundId));
    // console.log(newSoundId);
}
/**写法2
 * 子组件中不变，同样要写@update:model-value
 * 父组件中使用v-model:stress-first-beat绑定，不需要手动回调
 * 父组件中使用watch监听变化，在watch中处理相应逻辑
 */
watch(
    [stressFirstBeat, stressFirstSubBeat],
    ([newBeat, newSubBeat], [oldBeat, oldSubBeat]) => {
        if (newBeat !== oldBeat) {
            //设置节拍器重拍逻辑
            tickPlayer.stressFirstBeat = newBeat;
            console.log('Beat updated:', newBeat);
        }
        if (newSubBeat !== oldSubBeat) {
            //设置节拍器重拍逻辑
            tickPlayer.stressFirstSubBeat = newSubBeat;
            console.log('SubBeat updated:', newSubBeat);
        }
    }
);


function onMetronomeBeat(evt: SubBeatEvent) {
    tickPlayer.playClick(evt);
    currentMainBeat.value = evt.mainBeatIndex;
    currentSubBeat.value = evt.subBeatIndex;
}

function handleRest() {
    bpm.value = 68;
    currentTimeSignature.value = 4;
    currentSubDevision.value = SUBDIVISION_TYPES[1].name;
    stressFirstBeat.value = true;
    stressFirstSubBeat.value = true;
    startMetronome();
}

// 组件卸载时清理定时器
onUnmounted(() => {
    stopMetronome()
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