// 数据格式化与"编码翻译"工具
import type { AuditStatus } from '@/types'

/** 审核状态翻译表：把状态编码翻译成中文文字 + 标签类型 */
export const STATUS_MAP: Record<AuditStatus, { text: string; tagType: 'warning' | 'success' | 'danger' }> = {
  pending: { text: '待审核', tagType: 'warning' },
  approved: { text: '已通过', tagType: 'success' },
  rejected: { text: '已拒绝', tagType: 'danger' }
}

/** 热度格式化：超过 1000 显示 1.2k */
export function formatHeat(heat: number): string {
  return heat >= 1000 ? (heat / 1000).toFixed(1) + 'k' : String(heat)
}

/** 根据游戏 id 找游戏名 */
export function gameName(gameId: string, games: { id: string; name: string }[]): string {
  return games.find((g) => g.id === gameId)?.name ?? gameId
}

/** 今天的日期字符串 yyyy-MM-dd */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
