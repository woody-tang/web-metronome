<template>
  <div class="time-signature">
    <div class='selections'>
      <q-select filled dense class="time-sig-select" transition-show="jump-up" behavior="menu"
        v-model="localTimeSignature" hide-dropdown-icon options-cover stack-label :options="timeSignatureOptions"
        label="拍号选择" @update:model-value="updateTimeSignature" />
      <q-select filled dense class="time-sig-select" transition-show="jump-up" behavior="menu"
        v-model="localSubDivisionType" hide-dropdown-icon options-cover stack-label :options="subDivisionOptions"
        label="子拍细分" @update:model-value="updateSubDivisionType" />
      <q-select filled dense class="time-sig-select" transition-show="jump-up" behavior="menu" v-model="localTimbreType"
        hide-dropdown-icon options-cover stack-label :options="availableSoundIds" label="音色选择"
        @update:model-value="updateTimbreType" />
    </div>
    <div class='stress-control'>
      <q-toggle label="压力主第一拍" v-model="localStressFirstBeat" @update:model-value="updateStressFirstBeat" />
      <q-toggle label="压力子第一拍" v-model="localStressFirstSubBeat" @update:model-value="updateStressFirstSubBeat" />
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref } from 'vue'
import { TIME_SIGNATURE_TYPES, SUBDIVISION_TYPES } from '../../utils/MetronomeEngine.ts'
import { availableSoundIds } from '../../utils/MetronomeSoundPlayer.ts'
// #TODO:规范ts文件命名
const props = defineProps({
  timeSignature: {//节拍
    type: Number,
    required: true
  },
  subDivisionType: { //节拍细分
    type: String,
    default: ref(SUBDIVISION_TYPES[0].name)
  },
  timbrePresetType: { // 音色选择
    type: String,
    default: 'live-synth'//默认是实时合成的
  },
  stressFirstBeat: {
    type: Boolean,
    required: true
  },
  stressFirstSubBeat: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits([
  'update:time-signature', 'update:sub-division-type',
  'update:stress-first-beat', 'update:stress-first-sub-beat',
  'update:timbre-preset-type',
]);

const localTimeSignature = ref(TIME_SIGNATURE_TYPES[props.timeSignature - 1])
const localStressFirstBeat = ref(props.stressFirstBeat)
const localStressFirstSubBeat = ref(props.stressFirstSubBeat)
const localSubDivisionType = ref(props.subDivisionType);
const localTimbreType = ref(props.timbrePresetType);

const timeSignatureOptions = TIME_SIGNATURE_TYPES;
const subDivisionOptions = SUBDIVISION_TYPES.map(({ name }) => name);

function updateTimeSignature(newValue: string) {
  emit('update:time-signature', timeSignatureOptions.indexOf(newValue) + 1);
}

function updateSubDivisionType(newValue: string) {
  emit('update:sub-division-type', newValue)
}

function updateTimbreType(newValue: string) {
  emit('update:timbre-preset-type', newValue);
}


function updateStressFirstBeat(newValue: boolean) {
  emit('update:stress-first-beat', newValue)
}

function updateStressFirstSubBeat(newValue: boolean) {
  emit('update:stress-first-sub-beat', newValue)
}


</script>

<style scoped>
.time-signature {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

.selections {
  display: flex;
  flex-direction: row;
  margin-bottom: 5px;
  /* gap: 10px; */
}

.time-sig-select {
  /* width: 80px; */
  min-width: 70px;
  margin: 0 5px;
}

.stress-control {
  display: flex;
  flex-direction: row;
}
</style>