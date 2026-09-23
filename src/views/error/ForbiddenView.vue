<script setup lang="ts">
// 403 无权限页
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
</script>

<template>
  <div class="error-page">
    <h1 class="code">403</h1>
    <p class="msg">抱歉，你没有访问该页面的权限</p>
    <p class="sub">可以切换其他角色账号，或联系管理员在「角色权限」中开通权限</p>
    <div class="actions">
      <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
      <el-button v-if="!userStore.isLoggedIn" @click="router.push('/login')">去登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #eef2ff, #fdf4ff);
}

.code {
  margin: 0;
  font-size: 110px;
  color: #6366f1;
  line-height: 1;
}

.msg {
  font-size: 20px;
  margin: 16px 0 6px;
}

.sub {
  color: #909399;
  font-size: 14px;
  margin: 0 0 24px;
}
</style>
