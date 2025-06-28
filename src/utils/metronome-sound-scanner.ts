// utils/soundScanner.ts
export interface MetronomeSound {
    id: string;
    name: string;
    hi: string; // 高音/重音文件路径
    lo: string; // 低音/轻音文件路径
}

export const localMetronomeSoundPacks: MetronomeSound[] = scanMetronomeSounds();

export function getSoundById(id: string): MetronomeSound {
    const sdpk = localMetronomeSoundPacks.find(sound => sound.id === id)
    if (sdpk)
        return sdpk;
    else
        return localMetronomeSoundPacks[0];
}

function scanMetronomeSounds(): MetronomeSound[] {
    try {
        // 获取assets/metronome-preset-sounds目录下所有wav文件
        const soundFiles = import.meta.glob('../assets/metronome-preset-sounds/*.wav', { eager: true }) as Record<string, { default: string }>;

        // 转换文件路径为文件名和路径的映射
        const fileEntries = Object.entries(soundFiles).map(([path, module]) => {
            return {
                fileName: path.split('/').pop() || '',
                filePath: module.default // 提取Vite解析后的最终路径
            };
        });

        // 按命名规则分组：xxx_hi.wav 和 xxx_lo.wav 为一组
        const soundGroups: Record<string, MetronomeSound> = {};

        fileEntries.forEach(({ fileName, filePath }) => {
            // 解析文件名格式：Perc_Can_hi.wav → ["Perc", "Can", "hi"]
            const parts = fileName.split('_');
            if (parts.length < 3) return; // 必须要有lo/hi和.wav后缀

            const type = parts.pop()?.replace('.wav', ''); // hi或lo
            const baseName = parts.join('_'); // Perc_Can
            const soundName = parts.slice(1).join(' '); // Can → 显示名称

            if (!soundGroups[baseName]) {
                soundGroups[baseName] = {
                    id: baseName.toLowerCase().replace(/_/g, '-'),
                    name: soundName,
                    hi: '',
                    lo: '',
                };
            }

            if (type === 'hi') {
                soundGroups[baseName].hi = filePath;
            } else if (type === 'lo') {
                soundGroups[baseName].lo = filePath;
            }
        });

        // 过滤出完整配对的音色组
        return Object.values(soundGroups).filter(sound => sound.hi && sound.lo);
    } catch (error) {
        console.error('扫描音色文件失败:', error);
        return [];
    }
}