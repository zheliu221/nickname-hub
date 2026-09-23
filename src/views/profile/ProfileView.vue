<script setup lang="ts">
// 个人中心：资料修改（头像上传预览）+ 修改密码 + 恢复演示数据
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { http } from '@/apis/request'
import { useUserStore } from '@/stores/user'
import { useRoleStore } from '@/stores/role'
import { clearAll } from '@/utils/storage'
import type { UserItem } from '@/types'

const userStore = useUserStore()
const roleStore = useRoleStore()

onMounted(() => roleStore.fetchRoles())

const form = reactive({
  nickname: userStore.userInfo?.nickname ?? '',
  avatar: userStore.userInfo?.avatar ?? ''
})

const roleNames = computed(() => {
  const map = new Map(roleStore.roles.map((r) => [r.id, r.name]))
  return (userStore.userInfo?.roles ?? []).map((id) => map.get(id) ?? id).join('、')
})

/** 头像选择：转 dataURL 预览 */
function onAvatarChange(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  if (raw.size > 1024 * 1024) {
    ElMessage.warning('头像图片不能超过 1MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => (form.avatar = reader.result as string)
  reader.readAsDataURL(raw)
}

/** 保存资料 */
async function saveProfile() {
  if (!form.nickname.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  try {
    const updated = await http.put<Partial<UserItem>>('/user/profile', {
      nickname: form.nickname,
      avatar: form.avatar
    })
    userStore.setUserInfo({ ...(userStore.userInfo as UserItem), ...updated })
    ElMessage.success('资料已更新')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 修改密码 ----------
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) =>
        value === pwdForm.newPassword ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: 'blur'
    }
  ]
}

async function changePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (pwdForm.oldPassword !== userStore.userInfo?.password) {
    ElMessage.error('原密码不正确')
    return
  }
  try {
    await http.put('/user/profile', { password: pwdForm.newPassword })
    userStore.setUserInfo({ ...(userStore.userInfo as UserItem), password: pwdForm.newPassword })
    ElMessage.success('密码修改成功')
    pwdFormRef.value?.resetFields()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 恢复演示数据（高危操作） ----------
async function resetDemo() {
  const ok = await ElMessageBox.confirm(
    '将清空所有本地数据并恢复初始演示数据，确定继续吗？',
    '危险操作',
    { type: 'error', confirmButtonText: '确认清空' }
  ).catch(() => false)
  if (!ok) return
  clearAll()
  location.href = '/login'
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <h2>个人中心</h2>
    </div>

    <el-row :gutter="16">
      <!-- 左：资料卡片 -->
      <el-col :xs="24" :md="10">
        <div class="nh-card">
          <h3>基本资料</h3>
          <div class="profile-top">
            <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="onAvatarChange">
              <el-avatar :size="72" :src="form.avatar" class="big-avatar">
                {{ form.nickname.slice(0, 1) }}
              </el-avatar>
            </el-upload>
            <span class="tip">点击头像更换（不超过 1MB）</span>
          </div>
          <el-form label-width="80px" style="margin-top: 16px">
            <el-form-item label="用户名">
              <el-input :model-value="userStore.userInfo?.username" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" maxlength="20" />
            </el-form-item>
            <el-form-item label="角色">
              <el-tag type="warning">{{ roleNames }}</el-tag>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveProfile">保存修改</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>

      <!-- 右：密码 + 危险区 -->
      <el-col :xs="24" :md="14">
        <div class="nh-card">
          <h3>修改密码</h3>
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px" style="max-width: 420px">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="nh-card danger-card">
          <h3>数据管理</h3>
          <p class="danger-tip">
            本项目数据保存在浏览器 localStorage 中。恢复演示数据会清空你新增/修改过的所有内容，
            回到初始状态。
          </p>
          <el-button type="danger" plain @click="resetDemo">恢复演示数据</el-button>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.big-avatar {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  font-size: 30px;
  cursor: pointer;
}

.tip {
  font-size: 12px;
  color: #909399;
}

.danger-card {
  margin-top: 16px;
}

.danger-tip {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px;
}
</style>
