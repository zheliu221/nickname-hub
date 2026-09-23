<script setup lang="ts">
// 404 页面不存在
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="error-page">
    <h1 class="code">404</h1>
    <p class="msg">页面走丢了，这个地址不存在</p>
    <p class="sub">地址可能输错了，或者页面还没有上线</p>
    <div class="actions">
      <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
      <el-button @click="router.push('/login')">去登录</el-button>
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
  background: linear-gradient(135deg, #fff7ed, #fef2f2);
}

.code {
  margin: 0;
  font-size: 110px;
  color: #f97316;
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
