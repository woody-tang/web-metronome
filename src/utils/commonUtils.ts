/**
 * 将数值限制在指定范围内
 * @param value 输入值
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 裁剪后的值
 */
export function clip(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}
