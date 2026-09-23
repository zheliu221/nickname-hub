<script setup lang="ts">
// 主布局：左侧动态菜单 + 顶栏（折叠按钮 / 面包屑 / 用户下拉）
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useNicknameStore } from '@/stores/nickname'
import { resetRouter, asyncRoutes } from '@/router'

const userStore = useUserStore()
const nicknameStore = useNicknameStore()
const route = useRoute()
const router = useRouter()

// 侧边栏「外号库」子菜单需要游戏列表
nicknameStore.fetchGames()

const isCollapse = ref(false)

// 动态菜单：由动态路由表 + 当前用户权限共同决定（RBAC 动态菜单渲染）
const menus = computed(() =>
  (asyncRoutes[0].children ?? [])
    .filter((r) => !r.meta?.hidden && r.meta?.permission && userStore.hasPermission(r.meta.permission))
    .map((r) => ({
      // 去掉路由里的可选参数部分（如 nicknames/:gameId? → /nicknames），得到菜单跳转地址
      path: '/' + r.path.split('/:')[0],
      title: r.meta!.title as string,
      icon: r.meta!.icon as string
    }))
)

/** 用户下拉菜单命令 */
async function onUserCommand(cmd: string) {
  if (cmd === 'profile') {
    router.push('/profile')
    return
  }
  if (cmd === 'logout') {
    // 高危操作：退出登录需要确认
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    userStore.logout()
    resetRouter() // 账号切换前重置动态路由
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}
</script>

<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="aside">
      <div class="logo">
        <span class="logo-icon">游</span>
        <span v-show="!isCollapse" class="logo-text">游话好说</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#1f2937"
        text-color="#cbd5e1"
        active-text-color="#ffd04b"
      >
        <template v-for="m in menus" :key="m.path">
          <!-- 外号库：子菜单列出全部与各游戏 -->
          <el-sub-menu v-if="m.path === '/nicknames' && nicknameStore.games.length" index="submenu-nicknames">
            <template #title>
              <el-icon><component :is="m.icon" /></el-icon>
              <span>{{ m.title }}</span>
            </template>
            <el-menu-item index="/nicknames">全部外号</el-menu-item>
            <el-menu-item
              v-for="g in nicknameStore.games"
              :key="g.id"
              :index="`/nicknames/${g.id}`"
            >
              {{ g.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="m.path">
            <el-icon><component :is="m.icon" /></el-icon>
            <template #title><span>{{ m.title }}</span></template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/dashboard'">
              {{ route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <el-dropdown @command="onUserCommand">
          <span class="user-info">
            <el-avatar :size="32" :src="userStore.userInfo?.avatar">
              {{ userStore.userInfo?.nickname?.slice(0, 1) }}
            </el-avatar>
            <span class="user-name">{{ userStore.userInfo?.nickname }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}

.aside {
  background: #1f2937;
  transition: width 0.2s;
  overflow-x: hidden;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  color: #fff;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  font-weight: bold;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
}

.aside :deep(.el-menu) {
  border-right: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
}

.main {
  background: #f5f7fb;
  overflow-y: auto;
}
</style>
