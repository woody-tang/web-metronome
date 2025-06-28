// Metronome.ts
// deepseek generated 2025.6.21

import { clip } from './common-utils.ts'

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
    private isPlaying: boolean = false;
    private mainBeatInterval?: number;
    private currentBpm: number = 120;
    private timeSignature: number = 4;
    private currentSubdivision: SubdivisionType = 'quarter';
    private currentMainBeat: number = 0;

    constructor(private onBeatCallBack?: (event: SubBeatEvent) => void) {
        this.scheduler = new SubdivisionScheduler();
    }

    public start(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentMainBeat = 0;
        BeatLogger.logNormal(`[Metronome] Starting at ${this.currentBpm} BPM`);

        this.playMainBeat(); // 立即播放第一拍

        // 设置主拍循环
        this.mainBeatInterval = window.setInterval(() => {
            this.currentMainBeat = (this.currentMainBeat + 1) % this.timeSignature;
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
        BeatLogger.logNormal(`[Metronome] Processing subbeat ${event.subBeatIndex} for main beat ${event.mainBeatIndex}`);
        BeatLogger.logNormal('-------------------DivisionLine--------------------------');



    }

    private getMainBeatDuration(): number {
        return (60 * 1000) / this.currentBpm;
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    public setBpm(bpm: number): void {
        this.currentBpm = clip(bpm, BPM_CONSTS.min, BPM_CONSTS.max);
        BeatLogger.logNormal(`[Metronome] BPM set to ${this.currentBpm}`);

        if (this.isPlaying) {
            this.restart();
        }
    }

    public setSubdivision(typeName: SubdivisionType): void {
        this.currentSubdivision = typeName;
        BeatLogger.logNormal(`[Metronome] Subdivision set to ${typeName}`);

        if (this.isPlaying) {
            this.scheduler.clearPendingTimeouts();
        }
    }

    /**
     * 设置节拍器拍号
     * @param timeSignature 新的拍号（1~6之间的整数）
     * @throws {Error} 如果参数不是整数或超出范围
     */
    public setTimeSignature(timeSignature: number): void {
        // 1. 参数校验
        if (!Number.isInteger(timeSignature)) {
            throw new Error(`Time signature must be an integer, got ${timeSignature}`);
        }

        // 2. 范围限制 (使用之前定义的clip函数)
        this.timeSignature = clip(timeSignature, 1, 6);

        // 4. 运行时状态处理
        if (this.isPlaying) {
            this.restart();
        }

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
