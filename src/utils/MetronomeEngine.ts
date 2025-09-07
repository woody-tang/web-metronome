// Metronome.ts

import { clip } from './common-utils.ts'
import { availableSoundIds, MetronomeSoundPlayer } from '../utils/MetronomeSoundPlayer.ts'
// types
export type SubdivisionType = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' |
    'dotted31' | 'dotted13' | 'front16' | 'back16' |
    'syncopation' | 'triplet-variant' | 'triplet-variant1';

interface Subdivision {
    name: SubdivisionType;
    pattern: number[];
    description: string;
    icon_src: string;
}

export interface SubBeatEvent {
    mainBeatIndex: number;
    isFirstMainBeat: boolean;
    subBeatIndex: number;
    isFirstSubBeat: boolean;
    durationMs: number;
    ratio: number;
    timeOffsetMs: number;
}

interface MetronomeState {
    bpm: number;//节拍器速度
    timeSignature: number;//每小节拍数
    subdivision: SubdivisionType;//节奏型
    timbre: string;//节拍器音色
    volume: number;//节拍器音量
    isMuted: boolean;//是否静音
    stressFirstBeat: boolean;//是否压力第一拍
    stressFirstSubBeat: boolean;//是否压力第一次拍
}

// config
// 状态
export const BPM_CONSTS = {
    max: 240,
    min: 20
}
export const TIME_SIGNATURE_TYPES = ['1/4 拍', '2/4 拍', '3/4 拍', '4/4 拍', '5/4 拍', '6/4 拍']

export const SUBDIVISION_TYPES: Subdivision[] = [
    { name: "quarter", pattern: [1], description: "四分音符", icon_src: "" },
    { name: "eighth", pattern: [0.5, 0.5], description: "八分音符", icon_src: "" },
    { name: "triplet", pattern: [1 / 3, 1 / 3, 1 / 3], description: "三连音", icon_src: "" },
    { name: "sixteenth", pattern: [0.25, 0.25, 0.25, 0.25], description: "十六分音符", icon_src: "" },
    { name: "dotted31", pattern: [0.75, 0.25], description: "前付点", icon_src: "" },
    { name: "dotted13", pattern: [0.25, 0.75], description: "后付点", icon_src: "" },
    { name: "back16", pattern: [0.5, 0.25, 0.25], description: "前八后十六", icon_src: "" },
    { name: "syncopation", pattern: [0.25, 0.5, 0.25], description: "切分节奏", icon_src: "" },
    { name: "front16", pattern: [0.25, 0.25, 0.5], description: "前十六后八", icon_src: "" },
    { name: "triplet-variant", pattern: [0.5, 1 / 6, 1 / 6, 1 / 6], description: "三连音变体", icon_src: "" },
    { name: "triplet-variant1", pattern: [1 / 6, 1 / 6, 1 / 6, 0.5], description: "三连音变体1", icon_src: "" }
];

// logger
class BeatLogger {
    private static debugging: boolean = false;

    private static getTimestamp(): string {
        return new Date().toISOString().slice(11, 23);
    }

    static logMainBeat(mainBeatIndex: number, durationMs: number): void {
        if (this.debugging) {
            console.log(`[${this.getTimestamp()}] MAIN BEAT #${mainBeatIndex} | Duration: ${durationMs}ms`);
        }
    }

    static logSubBeatScheduled(event: SubBeatEvent): void {
        if (this.debugging) {
            console.log(
                `[${this.getTimestamp()}] SCHEDULED SubBeat | Main: ${event.mainBeatIndex} ` +
                `Sub: ${event.subBeatIndex} (${event.isFirstSubBeat ? 'first' : 'follow'}) | ` +
                `Offset: ${event.timeOffsetMs}ms | Duration: ${event.durationMs}ms`
            );
        }
    }

    static logSubBeatTriggered(event: SubBeatEvent): void {
        if (this.debugging) {
            console.log(
                `[${this.getTimestamp()}] TRIGGERED SubBeat | Main: ${event.mainBeatIndex} ` +
                `Sub: ${event.subBeatIndex} | Ratio: ${event.ratio.toFixed(2)} ` +
                `| Late: ${performance.now() - (event.timeOffsetMs + event.mainBeatIndex * event.durationMs)}ms`
            );
        }
    }

    static logError(error: Error, context: string): void {
        if (this.debugging) {
            console.error(`[${this.getTimestamp()}] ERROR in ${context}:`, error);
        }
    }

    static logNormal(context: string): void {
        if (this.debugging) {
            console.log(`[${this.getTimestamp()}] ${context}`);
        }
    }
}

// scheduler
class SubdivisionScheduler {
    private timeouts: number[] = [];
    private audioContext: AudioContext | null = null;

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            BeatLogger.logNormal('[Scheduler] AudioContext initialized');
        } catch (error) {
            BeatLogger.logError(error as Error, 'AudioContext initialization');
        }
    }

    /**
     * 触发主拍并调度所有子拍
     */
    public triggerSubdivision(
        mainBeatDurationMs: number,
        mainBeatIndex: number,
        playCallback: (event: SubBeatEvent) => void,
        subdivisionType: SubdivisionType = 'quarter'
    ): void {
        this.clearPendingTimeouts();
        BeatLogger.logMainBeat(mainBeatIndex, mainBeatDurationMs);

        const config = SUBDIVISION_TYPES.find(t => t.name === subdivisionType);
        if (!config) {
            BeatLogger.logError(new Error(`Unknown subdivision type: ${subdivisionType}`), 'triggerSubdivision');
            return;
        }

        let accumulatedTimeMs = 0;

        config.pattern.forEach((ratio, subBeatIndex) => {
            const subBeatDurationMs = mainBeatDurationMs * ratio;
            const event: SubBeatEvent = {
                mainBeatIndex,
                isFirstMainBeat: mainBeatIndex === 0,
                subBeatIndex,
                isFirstSubBeat: subBeatIndex === 0,
                durationMs: subBeatDurationMs,
                ratio,
                timeOffsetMs: accumulatedTimeMs
            };

            BeatLogger.logSubBeatScheduled(event);

            if (subBeatIndex === 0) {
                // 第一个子拍立即触发
                this.triggerSubBeat(event, playCallback);
            } else {
                // 其他子拍通过setTimeout调度
                const timeout = window.setTimeout(() => {
                    this.triggerSubBeat(event, playCallback);
                }, accumulatedTimeMs);
                this.timeouts.push(timeout);
            }

            accumulatedTimeMs += subBeatDurationMs;
        });
    }

    private triggerSubBeat(event: SubBeatEvent, callback: (event: SubBeatEvent) => void): void {
        BeatLogger.logSubBeatTriggered(event);
        // 执行回调
        try {
            callback(event);
        } catch (error) {
            BeatLogger.logError(error as Error, 'playSubBeat callback');
        }
    }

    public clearPendingTimeouts(): void {
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts = [];
        BeatLogger.logNormal('[Scheduler] Cleared pending timeouts');
    }

    public dispose(): void {
        this.clearPendingTimeouts();
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close();
        }
        BeatLogger.logNormal('[Scheduler] Disposed');
    }
}

// metronome
export class Metronome {
    private scheduler: SubdivisionScheduler;
    private mainBeatInterval: number = 0;//存储计时器id

    //以下是节拍器数据
    private _isPlaying: boolean = false;
    private currentBpm: number = 68;
    private currentTimeSignature: number = 4;
    private currentSubdivision: SubdivisionType = 'quarter';
    private currentMainBeat: number = 0;
    private currentSubBeat: number = 0;
    // 以下为播放声音相关的变量
    private currentVolume: number = 65; // 65%，范围1-100
    private currentTimbrePreset: string = availableSoundIds[1];
    private _stressFirstBeat: boolean = true;
    private _stressFirstSubBeat: boolean = true;
    private _isMuted: boolean = false;
    private tickPlayer: MetronomeSoundPlayer = new MetronomeSoundPlayer(this.volume, this.currentTimbrePreset);

    public getCurrentMetronomeState(): MetronomeState | string {
        const result = {
            bpm: this.bpm,
            timeSignature: this.timeSignature,
            subdivision: this.subdivision,
            timbre: this.timbre,
            volume: this.volume,
            isMuted: this.isMuted,
            stressFirstBeat: this.stressFirstBeat,
            stressFirstSubBeat: this.stressFirstSubBeat
        }
        return result
    }

    constructor(metronomeState?: string, private onBeatCallBack?: (event: SubBeatEvent) => void) {
        this.scheduler = new SubdivisionScheduler();
        if (metronomeState) {
            try {
                // const restoredState = JSON.parse(metronomeState);
                Object.assign(this, JSON.parse(metronomeState));//恢复 TODO: 如果有人篡改了localstorage里面的数据，可能会造成不安全的情况，所以可能需要做类型校验。
            }
            catch (error) {
                console.error(`恢复数据失败:\n${error}`);
            }
        }
    }
    public get isPlaying(): boolean {
        return this._isPlaying;
    }
    private set isPlaying(v: boolean) {
        this._isPlaying = v;
    }

    private _bpmChangeTimeout: number | null = null;//用于防抖的定时器id
    public set bpm(v: number) {
        this.currentBpm = clip(v, BPM_CONSTS.min, BPM_CONSTS.max);
        BeatLogger.logNormal(`[Metronome] BPM set to ${this.currentBpm}`);
        // 防止设置过快，产生啸叫声（防抖）
        // 清除之前的定时器
        if (this._bpmChangeTimeout) {
            clearTimeout(this._bpmChangeTimeout);
        }
        // 设置新的防抖定时器
        this._bpmChangeTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.restart();
            }
            this._bpmChangeTimeout = null;
        }, 50);

    }
    public get bpm(): number {
        return this.currentBpm;
    }

    /**
     * 设置节拍器拍号
     * @param timeSignature 新的拍号（1~6之间的整数）
     * @throws {Error} 如果参数不是整数或超出范围
     */
    public set timeSignature(v: number) {
        // 1. 参数校验
        if (!Number.isInteger(v)) {
            throw new Error(`Time signature must be an integer, got ${v}`);
        }

        // 2. 范围限制 (使用之前定义的clip函数)
        this.currentTimeSignature = clip(v, 1, 6);

        // 4. 运行时状态处理
        if (this.isPlaying) {
            this.restart();
        }
    }

    public get timeSignature(): number {
        return this.currentTimeSignature;
    }

    public set subdivision(typeName: SubdivisionType) {
        this.currentSubdivision = typeName;
        BeatLogger.logNormal(`[Metronome] Subdivision set to ${typeName}`);

        if (this.isPlaying) {
            this.scheduler.clearPendingTimeouts();
        }
    }

    public get subdivision(): SubdivisionType {
        return this.currentSubdivision;
    }

    public get mainBeat(): number {
        return this.currentMainBeat;
    }

    public get subBeat(): number {
        return this.currentSubBeat;
    }
    public set volume(v: number) {
        this.currentVolume = clip(v, 0, 100);
        this.tickPlayer.volume = this.currentVolume;
    }
    public get volume(): number {
        return this.currentVolume;
    }
    public mute(): void {
        this._isMuted = true;
    }
    public unMute(): void {
        this._isMuted = false;
    }
    public set isMuted(v: boolean) {
        this._isMuted = v;
    }
    public get isMuted(): boolean {
        return this._isMuted;
    }
    public set timbre(v: string) {
        this.currentTimbrePreset = v;
        this.tickPlayer.updateSound(v);
    }
    public get timbre(): string {
        return this.currentTimbrePreset;
    }
    public set stressFirstBeat(v: boolean) {
        this.tickPlayer.stressFirstBeat = v;
        this._stressFirstBeat = v;
    }
    public get stressFirstBeat(): boolean {
        return this._stressFirstBeat;
    }
    public set stressFirstSubBeat(v: boolean) {
        this.tickPlayer.stressFirstSubBeat = v
        this._stressFirstSubBeat = v;
    }
    public get stressFirstSubBeat(): boolean {
        return this._stressFirstSubBeat;
    }
    public start(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentMainBeat = 0;
        BeatLogger.logNormal(`[Metronome] Starting at ${this.currentBpm} BPM`);

        this.playMainBeat(); // 立即播放第一拍

        // 设置主拍循环
        this.mainBeatInterval = window.setInterval(() => {
            this.currentMainBeat = (this.currentMainBeat + 1) % this.currentTimeSignature;
            this.playMainBeat();
        }, this.getMainBeatDuration());
    }

    private playMainBeat(): void {
        const mainBeatDuration = this.getMainBeatDuration();

        this.scheduler.triggerSubdivision(
            mainBeatDuration,
            this.currentMainBeat,
            (event) => this.onSubBeat(event),
            this.currentSubdivision
        );
    }

    private onSubBeat(event: SubBeatEvent): void {
        if (this.onBeatCallBack)
            this.onBeatCallBack(event);
        // 默认回调
        if (!this.isMuted)
            this.tickPlayer.playClick(event);
        this.currentSubBeat = event.subBeatIndex;
        BeatLogger.logNormal(`[Metronome] Processing subbeat ${event.subBeatIndex} for main beat ${event.mainBeatIndex}`);
        BeatLogger.logNormal('-------------------DivisionLine--------------------------');
    }

    private getMainBeatDuration(): number {
        return (60 * 1000) / this.currentBpm;
    }

    private restart(): void {
        this.stop();
        this.start();
    }

    public stop(): void {
        if (!this.isPlaying) return;

        clearInterval(this.mainBeatInterval);
        this.scheduler.clearPendingTimeouts();
        this.isPlaying = false;
        BeatLogger.logNormal('[Metronome] Stopped');
    }

    public dispose(): void {
        this.stop();
        this.scheduler.dispose();
    }
}
