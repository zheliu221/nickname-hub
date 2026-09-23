// 角色仓库：角色列表 / 权限修改
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/apis/request'
import type { RoleItem } from '@/types'

export const useRoleStore = defineStore('role', () => {
  const roles = ref<RoleItem[]>([])
  const loading = ref(false)

  async function fetchRoles() {
    loading.value = true
    try {
      roles.value = await http.get<RoleItem[]>('/roles')
    } finally {
      loading.value = false
    }
  }

  /** 更新角色权限点 */
  async function updatePermissions(id: string, permissions: string[]) {
    await http.put<RoleItem>(`/roles/${id}`, { permissions })
  }

  return { roles, loading, fetchRoles, updatePermissions }
})
