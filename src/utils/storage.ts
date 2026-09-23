// localStorage 统一封装：统一前缀、JSON 序列化、容量溢出容错
const PREFIX = 'nhub_'

/** 读取，读不到或解析失败返回 fallback */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 保存，容量溢出时提示并返回 false */
export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** 删除 */
export function remove(key: string) {
  localStorage.removeItem(PREFIX + key)
}

/** 清空本项目的所有本地数据（恢复种子数据用） */
export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}
