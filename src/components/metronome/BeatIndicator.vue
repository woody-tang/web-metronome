<script setup lang="ts">
import { mdiMusicNoteQuarter, mdiMusicNoteEighth, mdiMusicNoteSixteenth, mdiMusicNoteEighthDotted, mdiNumeric3 } from '@quasar/extras/mdi-v6'
defineProps<{
    currentMainBeat: number,
    currentSubBeat: number,
    timeSignature: number,
    currentPattern: number[],
    emphasizeFirstBeat: boolean,
    emphasizeFirstSubBeat: boolean,
}>();
</script>

<template>
    <div class="beat-container">
        <!-- 主拍指示器 -->
        <div class="beat-indicator">
            <div v-for="i in timeSignature" :key="'main-' + i" class="beat-circle" :class="{
                // i是从1开始的
                'main-active': currentMainBeat === i - 1,
                'main-stressed': emphasizeFirstBeat && currentMainBeat === 0 && i === 1,
            }">
                {{ i }}
            </div>
        </div>

        <!-- 子拍指示器 -->
        <div class="sub-beat-indicator">
            <div v-for="(subBeat, index) in currentPattern" :key="'sub-' + index" class="sub-beat-circle" :class="{
                'sub-active': currentSubBeat === index,
                'sub-stressed': emphasizeFirstSubBeat && currentSubBeat === 0 && index === 0
            }">
                <q-icon v-if="subBeat == 1" :name="mdiMusicNoteQuarter" size="sm" />
                <q-icon v-else-if="subBeat == 0.75" :name="mdiMusicNoteEighthDotted" size="sm" />
                <q-icon v-else-if="subBeat == 0.5" :name="mdiMusicNoteEighth" size="sm" />
                <q-icon v-else-if="subBeat == 0.25" :name="mdiMusicNoteSixteenth" size="sm" />
                <div v-else-if="subBeat == 1 / 3" class="row no-wrap">
                    <q-icon :name="mdiMusicNoteEighth" size="sm" style="margin-right: -8px;" />
                    <q-icon :name="mdiNumeric3" size="xs" />
                </div>
                <div v-else-if="subBeat == 1 / 6" class="row no-wrap">
                    <q-icon :name="mdiMusicNoteSixteenth" size="sm" style="margin-right: -8px;" />
                    <q-icon :name="mdiNumeric3" size="xs" />
                </div>
                <q-icon v-else :name="mdiMusicNoteEighthDotted" size="sm" />

            </div>
        </div>
    </div>
</template>


<style scoped>
.beat-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px 0;
}

.beat-indicator {
    display: flex;
    flex-direction: row;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 15px;
}

.sub-beat-indicator {
    display: flex;
    flex-direction: row;
    gap: 10px;
    flex-wrap: wrap;
}

.beat-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: #666;
    transition: all 0.2s ease;
}

.beat-circle.main-active {
    background-color: #1976d2;
    color: white;
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(25, 118, 210, 0.5);
}

.beat-circle.main-stressed {
    background-color: #d32f2f;
    box-shadow: 0 0 15px rgba(211, 47, 47, 0.6);
}

.sub-beat-circle {
    width: 36px;
    height: 36px;
    /*偶数 否则图标会跳动*/
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    transition: all 0.15s ease;
}

.sub-beat-circle.sub-active {
    background-color: #42a5f5;
    transform: scale(1.15);
    box-shadow: 0 0 8px rgba(66, 165, 245, 0.5);
}

.sub-beat-circle.sub-stressed {
    background-color: #ff7043;
    box-shadow: 0 0 12px rgba(255, 112, 67, 0.6);
}
</style>
