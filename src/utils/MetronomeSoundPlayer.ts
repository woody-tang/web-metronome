// audioProcessor.ts
// deepseek generated 2025.6.21

import type { MetronomeSound } from "./metronome-sound-scanner.ts";
import type { SubBeatEvent } from './MetronomeEngine.ts'

import { BPM_CONSTS } from './MetronomeEngine.ts'
import { localMetronomeSoundPacks } from "./metronome-sound-scanner.ts";
import { clip } from './common-utils.ts'

type SynthType = "triangle" | "square" | 'sine' | 'sawtooth'
interface LiveMetronomeSound {
  id: string;
  type: SynthType;
  vol: number;
  hiFreq: number;
  secondHiFreq: number;
  loFreq: number;
}

const availableLiveSounds: LiveMetronomeSound[] = [
  { id: "live-triangle", type: 'triangle', hiFreq: 800, loFreq: 440, secondHiFreq: 660, vol: 1.0 },
  { id: "live-square", type: 'square', hiFreq: 800, loFreq: 440, secondHiFreq: 660, vol: 0.5 },
  { id: "live-sine", type: 'sine', hiFreq: 800, loFreq: 440, secondHiFreq: 660, vol: 1.0 },
  { id: "live-sawtooth", type: 'sawtooth', hiFreq: 800, loFreq: 440, secondHiFreq: 660, vol: 0.6 },
]
const availableLiveSoundIds: string[] = availableLiveSounds.map(ob => ob.id);

export const availableSounds: Array<LiveMetronomeSound | MetronomeSound> = [...availableLiveSounds, ...localMetronomeSoundPacks];

export const availableSoundIds: string[] = availableSounds.map(ob => ob.id);

export class MetronomeSoundPlayer {
  private audioContext: AudioContext | null = null;
  private liveSoundPlayer: SyntheticSoundPlayer | null = null;
  private presetPlayer: AudioProcessor | null = null;
  private _stFiBe: boolean = true;
  private _stFiSu: boolean = true;
  private _volume: number = 100;
  private _mute: boolean = false;
  // 合成声音的增益范围（对数）
  private readonly SYNTH_GAIN_RANGE = { min: 0.01, max: 2.0 };
  // 预设音的增益范围（对数）
  private readonly PRESET_GAIN_RANGE = { min: 1.0, max: 60.0 };
  constructor(
    volume: number = 100,
    private soundId: string = availableSoundIds[0],
  ) {
    this.volume = volume; // 使用setter方法，限制范围
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.liveSoundPlayer = new SyntheticSoundPlayer(this.audioContext, 2, availableLiveSounds[0])
      this.presetPlayer = new AudioProcessor(this.audioContext, localMetronomeSoundPacks[0], 50, 50)
    } catch (error) {
      console.error(error as Error, 'AudioContext initialization');
    }
  }

  get volume(): number {
    return this._volume;
  }
  set volume(value: number) {
    if (value <= 0)
      this._mute = true;
    else
      this._mute = false;
    this._volume = clip(value, 1, 100);
    this.updateSound(this.soundId);
    // TODO: 添加调整两个音频播放器的音量
  }
  set stressFirstBeat(val: boolean) {
    this._stFiBe = val;
  }
  get stressFirstBeat() {
    return this._stFiBe;
  }
  set stressFirstSubBeat(val: boolean) {
    this._stFiSu = val;
  }
  get stressFirstSubBeat() {
    return this._stFiSu;
  }
  private volToLiveGain(): number {
    // #TODO: 根据音量换算成live播放器的gain
    const min = Math.log10(this.SYNTH_GAIN_RANGE.min);
    const max = Math.log10(this.SYNTH_GAIN_RANGE.max);
    const logRange = max - min;
    const logValue = min + (Math.log10(this.volume) / 2) * logRange;

    return Math.pow(10, logValue);
    // return 2.0;
  }
  private volToPresetGain(): number {
    // #TODO: 根据音量换算成live播放器的gain
    const min = Math.log10(this.PRESET_GAIN_RANGE.min);
    const max = Math.log10(this.PRESET_GAIN_RANGE.max);
    const logRange = max - min;
    const logValue = min + (Math.log10(this.volume) / 2) * logRange;

    return Math.pow(10, logValue);
    // return 50.0;
  }
  public updateSound(soundId: string): boolean {
    const foundSound = availableSounds.find(sound => sound.id === soundId);
    if (!foundSound) {
      console.warn('invalid soundId');
      return false;
    }
    this.soundId = soundId;
    // #TODO:不要找两次！
    if (this.soundType() === 'live') {
      this.liveSoundPlayer?.setSound(foundSound as LiveMetronomeSound, this.volToLiveGain());
    } else
      this.presetPlayer?.setSound(foundSound as MetronomeSound, this.volToPresetGain());
    return true;
  }

  public playClick(e: SubBeatEvent) {
    if (this._mute) return;
    if (!this.audioContext) return;

    if (e.isFirstMainBeat && e.isFirstSubBeat && this._stFiBe) { // 压力主拍第一拍
      this.playHi(e.durationMs);
    } else if (e.isFirstSubBeat && !e.isFirstMainBeat && this._stFiSu) { // 压力子拍第一拍
      this.playSecondHi(e.durationMs);
    } else if ((e.isFirstSubBeat && e.isFirstMainBeat) && (this._stFiSu && !this._stFiBe)) {
      this.playSecondHi(e.durationMs);
    } else { // 普通拍子
      this.playLo(e.durationMs);
    }
  }
  private soundType(): 'live' | 'preset' {
    if (availableLiveSoundIds.find(id => id === this.soundId)) {
      return 'live';
    } else
      return 'preset';
  }

  private playHi(durationMs: number) {
    if (this.soundType() === 'live') {
      this.liveSoundPlayer?.playHi(durationMs);
    } else {
      this.presetPlayer?.playHi();
    }
  }
  private playSecondHi(durationMs: number) {
    if (this.soundType() === 'live') {
      this.liveSoundPlayer?.playSecondHi(durationMs);
    } else {
      this.presetPlayer?.playSecondHi();
    }
  }
  private playLo(durationMs: number) {
    if (this.soundType() === 'live') {
      this.liveSoundPlayer?.playLo(durationMs);
    } else {
      this.presetPlayer?.playLo();
    }
  }
}

class AudioProcessor {

  private hiBuffer: AudioBuffer | null = null;
  private loBuffer: AudioBuffer | null = null;
  //   private secondHiBuffer: AudioBuffer | null = null; TODO：次强
  private _preloaded = false;

  // private static audioCache = new Map<string, AudioBuffer>(); // 静态变量 缓存 不跟随实例
  constructor(
    private audioContext: AudioContext,
    private sound: MetronomeSound = localMetronomeSoundPacks[0],// TODO：这种类型构造函数会导致什么问题？tsconfig.app.json关闭了erasableSyntaxOnly
    private hiVolume: number = 50.0,
    private loVolume: number = 50.0,
  ) {
  }

  // 修改音色
  public setSound(sd: MetronomeSound, volume: number): void {
    this.sound = sd;
    this._preloaded = false;
    this.volume = volume;
    this.init();
  }
  public playHi() {
    this.play(true);
  }
  public playSecondHi() {
    this.play(false);// TODO：决定是否添加secondHi逻辑
  }
  public playLo() {
    this.play(false);
  }
  set volume(val: number) {
    const volume = clip(val, 1, 100);
    this.hiVolume = volume;
    this.loVolume = volume;
    this._preloaded = false;
  }
  // 播放音色
  private play(isAccent: boolean = true): void {
    if (!this._preloaded) {
      this.init()
      return;
    }
    if (!this.audioContext) return;
    const buffer = isAccent ? this.hiBuffer : this.loBuffer;
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  // 初始化并加载音频
  private async init(): Promise<boolean> {
    if (this._preloaded) return true;
    if (!this.audioContext) return false;
    try {
      // iOS等设备需要resume AudioContext
      // 创建AudioContext（但尚未加载音频）
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      // 加载并处理两个音频文件
      [this.hiBuffer, this.loBuffer] = await Promise.all([
        this.loadAndProcessAudio(this.sound.hi, this.hiVolume),
        this.loadAndProcessAudio(this.sound.lo, this.loVolume)
      ]);

      this._preloaded = true;
      return true;
    } catch (error) {
      console.error('Failed to preload audio:', error);
      return false;
    }
  }

  // 私有方法：加载和处理单个音频文件
  private async loadAndProcessAudio(
    path: string,
    volume: number,
  ): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    // 检查缓存
    // const cacheKey = `${path}_${volume}`;
    // if (AudioProcessor.audioCache.has(cacheKey)) {
    //   return AudioProcessor.audioCache.get(cacheKey)!;
    // }

    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = originalBuffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = volume;
    //#TODO: 研究压缩器原理
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -100; // 极低阈值（几乎不触发）
    compressor.ratio.value = 1;        // 比例 1:1（无压缩）
    compressor.knee.value = 0;         // 硬拐点

    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(offlineCtx.destination);

    source.start(0);
    // #TODO 研究这种异步方法为什么可以直接调用而不会出问题，而不是和python一样的阻塞
    const processedBuffer = await offlineCtx.startRendering();

    // 存入缓存
    // AudioProcessor.audioCache.set(cacheKey, processedBuffer);
    return processedBuffer;
  }

  // 清理资源
  public dispose(): void {
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.hiBuffer = null;
    this.loBuffer = null;
    this._preloaded = false;
  }

  // // 添加清理缓存的静态方法
  // public static clearCache(): void {
  //   AudioProcessor.audioCache.clear();
  // }
}

class SyntheticSoundPlayer {
  private static minGainVal = 0.5;
  private static maxGainVal = 2.5;

  constructor(
    private audioContext: AudioContext,
    private gainValue: number = SyntheticSoundPlayer.minGainVal,
    private soundConfig: LiveMetronomeSound = availableLiveSounds[0]
  ) {
    if (!(gainValue >= SyntheticSoundPlayer.minGainVal && gainValue <= SyntheticSoundPlayer.maxGainVal)) {

      this.gainValue = clip(gainValue, SyntheticSoundPlayer.minGainVal, SyntheticSoundPlayer.maxGainVal)
      // Math.max(SyntheticSoundPlayer.minGainVal, Math.min(SyntheticSoundPlayer.maxGainVal, gainValue))
      console.warn(`gainValue(${gainValue}) out of range [${SyntheticSoundPlayer.minGainVal},
         ${SyntheticSoundPlayer.maxGainVal}], set to ${this.gainValue}`);
    }
  }
  public setSound(sdType: LiveMetronomeSound, vol: number) {
    this.soundConfig = sdType;
    this.gainValue = clip(vol, SyntheticSoundPlayer.minGainVal, SyntheticSoundPlayer.maxGainVal) * sdType.vol
  }
  public playHi(durationMs: number = 100) {
    this.playSound('hi', durationMs);
  }
  public playSecondHi(durationMs: number = 100) {
    this.playSound('secondHi', durationMs);
  }
  public playLo(durationMs: number = 100) {
    this.playSound('lo', durationMs);
  }

  private playSound(type: 'hi' | 'lo' | 'secondHi' = 'lo', durationMs: number = 100): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // this.adjustSound(oscillator, event);
    oscillator.type = this.soundConfig.type;
    switch (type) {
      case 'hi':
        oscillator.frequency.value = this.soundConfig.hiFreq;
        break;
      case 'secondHi':
        oscillator.frequency.value = this.soundConfig.secondHiFreq;
        break;
      case 'lo':
        oscillator.frequency.value = this.soundConfig.loFreq;
        break;
    }

    gainNode.gain.setValueAtTime(this.gainValue, this.audioContext.currentTime);
    /**
     * 确定最短时间限制​​
     * 目标​​：支持 BPM=386×4=1544（即每拍 ≈38.8ms）
     * 最小淡出时间​​：建议取 ​​单拍时长的 1/4~1/2
     */
    const minFadeDuration = (60 * 1000 / (BPM_CONSTS.max * 4));
    const maxFadeDuration = 500;
    const fadeDuration = durationMs;
    const adjustedFadeDuration = clip(fadeDuration, minFadeDuration, maxFadeDuration);

    // console.log(`befor:${fadeDuration}, min:${minFadeDuration}, max:${maxFadeDuration}, after:${adjustedFadeDuration}`);
    gainNode.gain.exponentialRampToValueAtTime(
      // ​​音效意义​​：模拟自然声音的衰减（如鼓声的尾音）
      0.01,      // 在指定时间内将音量从0.5以指数曲线​​平滑降低到降至2%，必须>0
      this.audioContext.currentTime + adjustedFadeDuration / 1000
    );
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + adjustedFadeDuration / 1000);
  }

}