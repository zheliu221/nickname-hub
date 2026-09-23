// CSV 导出工具：带 BOM 头，保证 Excel 打开中文不乱码

/** 把一行数据里的特殊字符转义（逗号、引号、换行） */
function escapeCell(value: string | number): string {
  const s = String(value ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * 导出 CSV 文件
 * @param filename 文件名（自动补 .csv）
 * @param headers 表头
 * @param rows 数据行
 */
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))]
  // \uFEFF 是 UTF-8 BOM，没有它 Excel 打开中文会乱码
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
