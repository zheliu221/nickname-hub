// 用户仓库：token / 用户信息 / 权限点，全部持久化到 localStorage
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/apis/request'
import { load, remove, save } from '@/utils/storage'
import type { LoginResult, RoleItem, UserItem } from '@/types'

export const useUserStore = defineStore('user', () => {
  const token = ref(load('token', ''))
  const userInfo = ref<UserItem | null>(load<UserItem | null>('userInfo', null))
  const permissions = ref<string[]>(load('permissions', []))
  /** 动态路由是否已注册（页面刷新后需要重新注册） */
  const routesLoaded = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  /** 是否拥有某个权限点 */
  function hasPermission(perm: string) {
    return permissions.value.includes(perm)
  }

  /** 登录：获取 token 和用户信息，并按角色汇总权限点 */
  async function login(username: string, password: string) {
    const res = await http.post<LoginResult>('/auth/login', { username, password })
    token.value = res.token
    // 先持久化 token：后续请求拦截器从 localStorage 读取并自动携带
    save('token', res.token)
    userInfo.value = res.userInfo
    // RBAC：用户 → 角色 → 权限点集合
    const roles = await http.get<RoleItem[]>('/roles')
    permissions.value = roles
      .filter((r) => res.userInfo.roles.includes(r.id))
      .flatMap((r) => r.permissions)
    routesLoaded.value = false // 账号切换后需要重新生成动态路由
    persist()
  }

  /** 更新本地用户信息（个人中心修改资料后调用） */
  function setUserInfo(u: UserItem) {
    userInfo.value = u
    save('userInfo', u)
  }

  /** 退出登录：清空状态与持久化数据 */
  function logout() {
    token.value = ''
    userInfo.value = null
    permissions.value = []
    routesLoaded.value = false
    remove('token')
    remove('userInfo')
    remove('permissions')
  }

  function persist() {
    save('token', token.value)
    save('userInfo', userInfo.value)
    save('permissions', permissions.value)
  }

  return { token, userInfo, permissions, routesLoaded, isLoggedIn, hasPermission, login, setUserInfo, logout }
})
