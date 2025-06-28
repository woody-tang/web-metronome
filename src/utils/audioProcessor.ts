// audioProcessor.ts
// deepseek generated 2025.6.21

import type { MetronomeSound } from "./metronome-sound-scanner.ts";
import type { SubBeatEvent } from './MetronomeEngine.ts'
import { BPM_CONSTS } from './MetronomeEngine.ts'
import { localMetronomeSoundPacks } from "./metronome-sound-scanner.ts";
import { clip } from './commonUtils.ts'


export class AudioProcessor {
  private audioContext: AudioContext;
  private hiBuffer: AudioBuffer | null = null;
  private loBuffer: AudioBuffer | null = null;
  //   private secondHiBuffer: AudioBuffer | null = null; TODO：次强
  private _isInitialized = false;

  constructor(
    private sound: MetronomeSound = localMetronomeSoundPacks[0],// TODO：这种类型构造函数会导致什么问题？tsconfig.app.json关闭了erasableSyntaxOnly
    // private readonly basePath: string = '/src/assets/Metronomes/',
    private readonly hiVolume: number = 10.0,
    private readonly loVolume: number = 10.0,
  ) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  // 初始化并加载音频
  public async init(): Promise<boolean> {
    if (this._isInitialized) return true;

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

      this._isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }
  // 修改音色
  public setSound(sd: MetronomeSound): void {
    this.sound = sd;
    this._isInitialized = false;
    this.init();
  }

  // 播放音色
  public play(isAccent: boolean = true): void {
    if (!this._isInitialized) {
      this.init()
      console.warn('Audio not initialized');
      return;
    }

    const buffer = isAccent ? this.hiBuffer : this.loBuffer;
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  // 私有方法：加载和处理单个音频文件
  private async loadAndProcessAudio(
    path: string,
    volume: number
  ): Promise<AudioBuffer> {
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
    return await offlineCtx.startRendering();
  }

  // 清理资源
  public dispose(): void {
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.hiBuffer = null;
    this.loBuffer = null;
    this._isInitialized = false;
  }

}

export class SyntheticSoundPlayer {
  private audioContext: AudioContext | null = null;
  private static minGainVal = 0.5;
  private static maxGainVal = 5.0;
  private _stressFirstBeat: boolean = true; // #TODO: 解耦，不要把主界面的功能放到这个类里面来
  private _stressFirstSubBeat: boolean = true;

  constructor(private gainValue: number = SyntheticSoundPlayer.minGainVal) {
    if (!(gainValue >= SyntheticSoundPlayer.minGainVal && gainValue <= SyntheticSoundPlayer.maxGainVal)) {

      this.gainValue = clip(gainValue, SyntheticSoundPlayer.minGainVal, SyntheticSoundPlayer.maxGainVal)
      // Math.max(SyntheticSoundPlayer.minGainVal, Math.min(SyntheticSoundPlayer.maxGainVal, gainValue))
      console.warn(`gainValue(${gainValue}) out of range [${SyntheticSoundPlayer.minGainVal},
         ${SyntheticSoundPlayer.maxGainVal}], set to ${this.gainValue}`);
    }
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext initialized');
    } catch (error) {
      console.error(error as Error, 'AudioContext initialization');
    }
  }

  get stressFirstBeat(): boolean {
    return this._stressFirstBeat;
  }
  set stressFirstBeat(v: boolean) {
    this._stressFirstBeat = v;
  }
  get stressFirstSubBeat(): boolean {
    return this._stressFirstSubBeat;
  }
  set stressFirstSubBeat(v: boolean) {
    this._stressFirstSubBeat = v;
  }

  public playSound(event: SubBeatEvent): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    this.adjustSound(oscillator, event);
    // oscillator.type = this.getWaveType(event);
    // oscillator.frequency.value = this.getFrequency(event);

    gainNode.gain.setValueAtTime(this.gainValue, this.audioContext.currentTime);
    // gainNode.gain.value = this.gainTimes; // 音量放大，控制在6.0以下

    /**
     * 确定最短时间限制​​
     * 目标​​：支持 BPM=386×4=1544（即每拍 ≈38.8ms）
     * 最小淡出时间​​：建议取 ​​单拍时长的 1/4~1/2
     */
    const minFadeDuration = (60 * 1000 / (BPM_CONSTS.max * 4));
    const maxFadeDuration = 500;
    const fadeDuration = event.durationMs;
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
  private adjustSound(oscillator: OscillatorNode, e: SubBeatEvent) {
    oscillator.type = 'triangle'//'square' 'triangle' 'sine' 'sawtooth'
    if (e.isFirstMainBeat && e.isFirstSubBeat && this.stressFirstBeat) { // 压力主拍第一拍
      oscillator.frequency.value = 880;
    } else if (e.isFirstSubBeat && !e.isFirstMainBeat && this.stressFirstSubBeat) { // 压力子拍第一拍
      oscillator.frequency.value = 660;
    } else if ((e.isFirstSubBeat && e.isFirstMainBeat) && (this.stressFirstSubBeat && !this.stressFirstBeat)) {
      oscillator.frequency.value = 660;
    } else { // 普通拍子
      oscillator.frequency.value = 440;
    }
  }

}