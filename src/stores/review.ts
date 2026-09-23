// 投稿审核仓库：投稿列表 / 提交 / 审核 / 批量删除（业务模块二）
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/apis/request'
import type { Contribution, PageResult } from '@/types'

export const useReviewStore = defineStore('review', () => {
  const list = ref<Contribution[]>([])
  const total = ref(0)
  const loading = ref(false)

  /** 投稿分页列表（可按状态筛选） */
  async function fetchList(query: { status?: string; page: number; pageSize: number }) {
    loading.value = true
    try {
      const res = await http.get<PageResult<Contribution>>('/contributions', { ...query })
      list.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  /** 提交投稿（普通玩家） */
  async function submit(data: Partial<Contribution>) {
    await http.post<Contribution>('/contributions', data)
  }

  /** 审核：status 为 approved 时自动采纳入外号库 */
  async function audit(id: number, status: 'approved' | 'rejected') {
    await http.put<Contribution>(`/contributions/${id}/audit`, { status })
  }

  async function remove(id: number) {
    await http.delete(`/contributions/${id}`)
  }

  async function batchRemove(ids: number[]) {
    return http.post<number>('/contributions/batch-delete', { ids })
  }

  return { list, total, loading, fetchList, submit, audit, remove, batchRemove }
})
