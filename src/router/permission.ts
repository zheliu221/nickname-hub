// 全局路由守卫：登录鉴权 → 动态路由注册 → 异常/越权处理
import router from './index'
import { addDynamicRoutes } from './index'
import { useUserStore } from '@/stores/user'

/** 无需登录即可访问的白名单 */
const WHITELIST = ['/login']

router.beforeEach((to) => {
  const userStore = useUserStore()

  // 1. 白名单：已登录访问登录页则回首页
  if (WHITELIST.includes(to.path)) {
    return userStore.isLoggedIn ? { path: '/dashboard' } : true
  }

  // 2. 未登录 → 跳转登录页，记录来源用于登录后回跳
  if (!userStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 3. 已登录但动态路由尚未注册（首次进入 / 刷新页面）→ 注册后重新进入
  if (!userStore.routesLoaded) {
    addDynamicRoutes(userStore.permissions)
    userStore.routesLoaded = true
    // 注意：按 path 重新进入。不能展开 to（会带上兜底路由的 name，导致仍命中兜底）
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  }

  // 4. 动态路由已注册但仍命中兜底路由 → 404（异常路由处理）
  if (to.name === 'fallback') return { path: '/404' }

  // 5. 没有访问权限 → 403（路由权限控制）
  const perm = to.meta?.permission
  if (perm && !userStore.hasPermission(perm)) return { path: '/403' }

  return true
})

// 同步浏览器标题
router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} - 游话好说` : '游话好说'
})
