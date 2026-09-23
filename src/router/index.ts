// 路由配置：静态路由 + 动态路由（RBAC）+ 路由重置
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

// 扩展路由 meta 的类型约束
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    permission?: string // 访问该页面需要的权限点
    hidden?: boolean // 是否在菜单中隐藏
  }
}

/** 静态路由：无需登录即可访问 */
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: { title: '403 无权限' }
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '404 页面不存在' }
  }
]

/** 动态路由表：登录后按权限动态注册，实现动态菜单 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'layout',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '首页', icon: 'HomeFilled', permission: 'dashboard:view' }
      },
      {
        // :gameId? 为可选参数 —— /nicknames 显示全部，/nicknames/genshin 显示指定游戏（侧边栏子菜单用）
        path: 'nicknames/:gameId?',
        name: 'nicknames',
        component: () => import('@/views/nickname/NicknameListView.vue'),
        meta: { title: '外号库', icon: 'Collection', permission: 'nicknames:view' }
      },
      {
        path: 'character/:gameId/:character',
        name: 'character',
        component: () => import('@/views/character/CharacterDetailView.vue'),
        meta: { title: '角色详情', permission: 'character:view', hidden: true }
      },
      {
        path: 'contribute',
        name: 'contribute',
        component: () => import('@/views/review/ContributeView.vue'),
        meta: { title: '我要投稿', icon: 'EditPen', permission: 'contribute:submit' }
      },
      {
        path: 'review',
        name: 'review',
        component: () => import('@/views/review/ReviewManageView.vue'),
        meta: { title: '投稿审核', icon: 'Checked', permission: 'review:view' }
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/role/RoleManageView.vue'),
        meta: { title: '角色权限', icon: 'Key', permission: 'roles:view' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: '个人中心', icon: 'UserFilled', permission: 'profile:view' }
      }
    ]
  }
]

/** 已动态注册的路由名（退出登录时统一移除，实现路由重置） */
let addedRouteNames: string[] = []

/** 路由重置：移除所有动态注册的路由 */
export function resetRouter() {
  addedRouteNames.forEach((name) => {
    if (router.hasRoute(name)) router.removeRoute(name)
  })
  addedRouteNames = []
}

/** 根据权限点注册动态路由 */
export function addDynamicRoutes(permissions: string[]) {
  resetRouter()
  const root = asyncRoutes[0]
  // 只注册当前用户有权限访问的页面 → 菜单随权限动态渲染
  const children = (root.children ?? []).filter(
    (r) => !r.meta?.permission || permissions.includes(r.meta.permission)
  )
  router.addRoute({ ...root, children })
  addedRouteNames.push(root.name!)
}

const router = createRouter({
  // hash 模式：GitHub Pages 等静态托管上刷新不会 404（URL 会带 /#/ 前缀）
  history: createWebHashHistory(),
  routes: [
    ...staticRoutes,
    // 兜底路由：动态路由注册前先兜住所有地址（避免刷新时报"无匹配"警告）；
    // 注册完成后再命中它，说明地址确实不存在 → 守卫中转 404
    {
      path: '/:pathMatch(.*)*',
      name: 'fallback',
      component: () => import('@/views/error/NotFoundView.vue')
    }
  ]
})

export default router
