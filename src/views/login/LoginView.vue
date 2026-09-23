<script setup lang="ts">
// 登录页：表单校验 + 三种演示角色一键切换
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

/** 演示账号：点击快速填充，体现账号切换 */
const demoAccounts = [
  { label: '管理员', username: 'admin', desc: '全部权限' },
  { label: '内容编辑', username: 'editor', desc: '外号管理 / 投稿审核' },
  { label: '普通玩家', username: 'user', desc: '浏览 / 投稿' }
]

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为 2-20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 个字符', trigger: 'blur' }
  ]
}

function fill(account: { username: string }) {
  form.username = account.username
  form.password = '123456'
}

async function handleLogin() {
  // 表单校验不通过直接返回
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form.username, form.password)
  } catch (e) {
    ElMessage.error((e as Error).message)
    return
  } finally {
    loading.value = false
  }
  ElMessage.success('登录成功，欢迎来到游话好说！')
  // 支持登录后回跳来源页面
  router.replace((route.query.redirect as string) || '/dashboard')
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="brand-icon">游</span>
        <h1>游话好说</h1>
        <p>游戏角色外号百科 · 查一查角色都叫啥</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="'User'" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="'Lock'"
          />
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>

      <el-divider>演示账号（密码都是 123456）</el-divider>
      <div class="demo-accounts">
        <div
          v-for="a in demoAccounts"
          :key="a.username"
          class="account-chip"
          @click="fill(a)"
        >
          <b>{{ a.label }}</b>
          <span>{{ a.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1f2937 0%, #3b4a6b 50%, #6d5a8e 100%);
}

.login-card {
  width: 420px;
  padding: 36px 40px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.brand {
  text-align: center;
  margin-bottom: 24px;
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 10px;
}

.brand h1 {
  margin: 0;
  font-size: 24px;
}

.brand p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}

.login-btn {
  width: 100%;
  letter-spacing: 8px;
}

.demo-accounts {
  display: flex;
  gap: 10px;
}

.account-chip {
  flex: 1;
  padding: 10px;
  border: 1px dashed #c0c4cc;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.account-chip:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.account-chip b {
  display: block;
  font-size: 14px;
}

.account-chip span {
  font-size: 12px;
  color: #909399;
}
</style>
