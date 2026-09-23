<script setup lang="ts">
// 角色权限管理页：角色列表 + 树形权限勾选（父子联动）+ 合法性校验
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTree } from 'element-plus'
import { useRoleStore } from '@/stores/role'
import { PERMISSION_TREE } from '@/data/seed'
import type { RoleItem } from '@/types'

const roleStore = useRoleStore()
const current = ref<RoleItem | null>(null)
const treeRef = ref<InstanceType<typeof ElTree>>()
const saving = ref(false)

onMounted(async () => {
  await roleStore.fetchRoles()
  if (roleStore.roles[0]) selectRole(roleStore.roles[0])
})

/** 所有叶子节点 key（父节点勾选状态由 el-tree 联动，不参与回显） */
const leafKeys = new Set(
  PERMISSION_TREE.flatMap((p) => (p.children?.length ? p.children.map((c) => c.key) : [p.key]))
)

/** 管理员角色的树节点全部禁用（不可修改） */
const isAdmin = computed(() => current.value?.id === 'admin')
const treeData = computed(() =>
  PERMISSION_TREE.map((p) => ({
    ...p,
    disabled: isAdmin.value,
    children: p.children?.map((c) => ({ ...c, disabled: isAdmin.value }))
  }))
)

/** 切换角色：回显已勾选的叶子权限，父节点自动联动 */
function selectRole(role: RoleItem) {
  current.value = role
  nextTick(() => {
    treeRef.value?.setCheckedKeys(role.permissions.filter((k) => leafKeys.has(k)))
  })
}

/** 保存权限修改 */
async function save() {
  if (!current.value || isAdmin.value) return
  const checked = treeRef.value!.getCheckedKeys() as string[]
  const half = treeRef.value!.getHalfCheckedKeys() as string[]
  const permissions = [...checked, ...half]

  // 合法性校验 1：至少保留一个权限
  if (permissions.length === 0) {
    ElMessage.error('角色至少需要保留一个权限，否则将无法访问系统')
    return
  }
  // 合法性校验 2：勾选了子权限时必须保留父权限（树联动已保证，这里做兜底检查）
  for (const p of PERMISSION_TREE) {
    if (p.children?.some((c) => checked.includes(c.key)) && !permissions.includes(p.key)) {
      ElMessage.error(`权限「${p.label}」下的子权限已勾选，必须保留该父权限`)
      return
    }
  }

  const ok = await ElMessageBox.confirm(
    `确定保存「${current.value.name}」的权限修改吗？修改将在对应账号下次登录后生效。`,
    '保存确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return

  saving.value = true
  try {
    await roleStore.updatePermissions(current.value.id, permissions)
    ElMessage.success('权限已保存')
    await roleStore.fetchRoles()
    current.value = roleStore.roles.find((r) => r.id === current.value?.id) ?? null
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <h2>角色权限管理</h2>
    </div>

    <el-row :gutter="16">
      <!-- 左侧：角色列表 -->
      <el-col :xs="24" :md="8">
        <div class="nh-card">
          <h3>角色列表</h3>
          <div
            v-for="role in roleStore.roles"
            :key="role.id"
            class="role-item"
            :class="{ active: current?.id === role.id }"
            @click="selectRole(role)"
          >
            <div class="role-name">
              {{ role.name }}
              <el-tag v-if="role.id === 'admin'" size="small" type="danger">内置</el-tag>
            </div>
            <div class="role-desc">{{ role.desc }}</div>
            <div class="role-count">权限点：{{ role.permissions.length }} 个</div>
          </div>
        </div>
      </el-col>

      <!-- 右侧：权限树 -->
      <el-col :xs="24" :md="16">
        <div class="nh-card">
          <div class="tree-head">
            <h3>
              权限配置
              <span v-if="current" class="current-role"> — {{ current.name }}</span>
            </h3>
            <el-button
              type="primary"
              :loading="saving"
              :disabled="isAdmin"
              v-permission="'roles:edit'"
              @click="save"
            >
              保存修改
            </el-button>
          </div>
          <el-alert
            v-if="isAdmin"
            type="info"
            :closable="false"
            title="管理员为内置角色，拥有全部权限，不允许修改"
            class="tip"
          />
          <el-tree
            ref="treeRef"
            :data="treeData"
            node-key="key"
            show-checkbox
            default-expand-all
            :props="{ label: 'label' }"
          />
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

.role-item {
  padding: 12px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-item:hover {
  border-color: #409eff;
}

.role-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.role-name {
  font-size: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-desc {
  font-size: 13px;
  color: #606266;
  margin: 6px 0;
}

.role-count {
  font-size: 12px;
  color: #909399;
}

.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tree-head h3 {
  margin: 0;
}

.current-role {
  color: #409eff;
  font-size: 14px;
}

.tip {
  margin-bottom: 12px;
}
</style>
