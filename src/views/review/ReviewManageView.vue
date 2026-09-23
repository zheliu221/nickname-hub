<script setup lang="ts">
// 业务模块二（管理侧）：投稿审核页
// 卡片流布局 · 状态筛选 · 单条/批量操作 · 审核确认与消息反馈
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useReviewStore } from '@/stores/review'
import { useNicknameStore } from '@/stores/nickname'
import { STATUS_MAP } from '@/utils/format'
import type { Contribution } from '@/types'

const reviewStore = useReviewStore()
const nicknameStore = useNicknameStore()

const activeStatus = ref('')
const query = reactive({ page: 1, pageSize: 9 })
const selectedIds = ref<number[]>([])

/** 选择模式：点击批量按钮后才显示复选框（approve=挑选要通过的，delete=挑选要删除的） */
const selectMode = ref<'' | 'approve' | 'delete'>('')
function enterSelect(mode: 'approve' | 'delete') {
  selectMode.value = mode
  selectedIds.value = []
}

function exitSelect() {
  selectMode.value = ''
  selectedIds.value = []
}

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' }
]

onMounted(async () => {
  await Promise.all([nicknameStore.fetchGames(), load()])
})

async function load() {
  await reviewStore.fetchList({ status: activeStatus.value, ...query })
}

/** 切换状态筛选 */
function switchStatus() {
  query.page = 1
  selectedIds.value = []
  selectMode.value = ''
  load()
}

function gameName(id: string) {
  return nicknameStore.games.find((g) => g.id === id)?.name ?? id
}

function gameColor(id: string) {
  return nicknameStore.games.find((g) => g.id === id)?.color ?? '#909399'
}

function isSelected(item: Contribution) {
  return selectedIds.value.includes(item.id)
}

function toggleSelect(item: Contribution) {
  const idx = selectedIds.value.indexOf(item.id)
  if (idx === -1) selectedIds.value.push(item.id)
  else selectedIds.value.splice(idx, 1)
}

/** 全选当前页（仅把待审核的加入通过列表） */
function toggleSelectAll() {
  const pageIds = reviewStore.list.map((i) => i.id)
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.value.includes(id))
  if (allChecked) {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    const others = selectedIds.value.filter((id) => !pageIds.includes(id))
    selectedIds.value = [...others, ...pageIds]
  }
}

const allSelectedOnPage = computed(() => {
  const ids = reviewStore.list.map((i) => i.id)
  return ids.length > 0 && ids.every((id) => selectedIds.value.includes(id))
})

/** 审核：通过则自动采纳入外号库 */
async function onAudit(item: Contribution, status: 'approved' | 'rejected') {
  const text = status === 'approved' ? '通过并采纳进外号库' : '拒绝'
  const ok = await ElMessageBox.confirm(
    `确定「${text}」投稿「${item.character} - ${item.nickname}」吗？`,
    '审核确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  try {
    await reviewStore.audit(item.id, status)
    ElMessage.success(status === 'approved' ? '已通过，外号已采纳入库' : '已拒绝该投稿')
    await load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/** 单条删除 */
async function onDelete(item: Contribution) {
  const ok = await ElMessageBox.confirm(
    `确定删除投稿「${item.character} - ${item.nickname}」吗？`,
    '删除确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  await reviewStore.remove(item.id)
  ElMessage.success('删除成功')
  await load()
}

/** 批量通过（仅对待审核的选中项生效） */
async function onBatchApprove() {
  const targets = reviewStore.list.filter(
    (i) => selectedIds.value.includes(i.id) && i.status === 'pending'
  )
  if (targets.length === 0) {
    ElMessage.warning('选中项中没有待审核的投稿')
    return
  }
  const ok = await ElMessageBox.confirm(
    `确定批量通过选中的 ${targets.length} 条投稿并采纳入库吗？`,
    '批量审核确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  for (const t of targets) {
    await reviewStore.audit(t.id, 'approved')
  }
  ElMessage.success(`已通过 ${targets.length} 条投稿`)
  selectedIds.value = []
  await load()
}

/** 批量删除 */
async function onBatchDelete() {
  const ok = await ElMessageBox.confirm(
    `确定批量删除选中的 ${selectedIds.value.length} 条投稿吗？`,
    '批量删除确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  const count = await reviewStore.batchRemove([...selectedIds.value])
  ElMessage.success(`已删除 ${count} 条投稿`)
  selectedIds.value = []
  await load()
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <h2>投稿审核</h2>
      <div class="toolbar">
        <!-- 常态：两个批量入口按钮 -->
        <template v-if="!selectMode">
          <el-button
            type="success"
            plain
            v-permission="'review:audit'"
            @click="enterSelect('approve')"
          >
            批量通过
          </el-button>
          <el-button
            type="danger"
            plain
            v-permission="'review:delete'"
            @click="enterSelect('delete')"
          >
            批量删除
          </el-button>
        </template>
        <!-- 选择模式：复选框出现后，确认执行或退出 -->
        <template v-else>
          <el-button @click="exitSelect">退出选择</el-button>
          <el-button
            :type="allSelectedOnPage ? 'default' : 'primary'"
            plain
            @click="toggleSelectAll"
          >
            {{ allSelectedOnPage ? '取消全选' : '全选本页' }} ({{ reviewStore.list.length }})
          </el-button>
          <el-button
            v-if="selectMode === 'approve'"
            type="success"
            :disabled="selectedIds.length === 0"
            v-permission="'review:audit'"
            @click="onBatchApprove"
          >
            通过所选 ({{ selectedIds.length }})
          </el-button>
          <el-button
            v-else
            type="danger"
            :disabled="selectedIds.length === 0"
            v-permission="'review:delete'"
            @click="onBatchDelete"
          >
            删除所选 ({{ selectedIds.length }})
          </el-button>
        </template>
      </div>
    </div>

    <!-- 状态筛选 -->
    <el-radio-group v-model="activeStatus" class="status-tabs" @change="switchStatus">
      <el-radio-button v-for="t in statusTabs" :key="t.value" :value="t.value">
        {{ t.label }}
      </el-radio-button>
    </el-radio-group>

    <!-- 卡片流 -->
    <div v-loading="reviewStore.loading" class="card-grid">
      <div v-for="item in reviewStore.list" :key="item.id" class="review-card nh-card">
        <!-- 选中框（仅选择模式下显示） -->
        <el-checkbox
          v-if="selectMode"
          :model-value="isSelected(item)"
          class="pick"
          @change="toggleSelect(item)"
        />
        <div class="card-head">
          <el-tag :color="gameColor(item.gameId)" size="small" style="color: #fff; border: none">
            {{ gameName(item.gameId) }}
          </el-tag>
          <el-tag size="small" :type="STATUS_MAP[item.status].tagType">
            {{ STATUS_MAP[item.status].text }}
          </el-tag>
        </div>

        <div class="card-title">
          {{ item.character }} <span class="nick">「{{ item.nickname }}」</span>
        </div>

        <el-image
          v-if="item.image"
          :src="item.image"
          :preview-src-list="[item.image]"
          fit="cover"
          class="card-img"
        />

        <p class="origin">{{ item.origin }}</p>

        <div class="card-tags">
          <el-tag v-for="t in item.tags" :key="t" size="small" type="info">{{ t }}</el-tag>
        </div>

        <div class="card-foot">
          <span class="meta">{{ item.contributor }} · {{ item.createdAt }}</span>
          <div class="ops" v-if="item.status === 'pending'">
            <el-button
              link
              type="success"
              v-permission="'review:audit'"
              @click="onAudit(item, 'approved')"
            >
              通过
            </el-button>
            <el-button
              link
              type="warning"
              v-permission="'review:audit'"
              @click="onAudit(item, 'rejected')"
            >
              拒绝
            </el-button>
          </div>
        </div>

        <div class="card-foot">
          <span />
          <el-button
            link
            type="danger"
            v-permission="'review:delete'"
            @click="onDelete(item)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="!reviewStore.loading && reviewStore.list.length === 0" description="暂无投稿" />

    <!-- 分页 -->
    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="reviewStore.total"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </div>
  </div>
</template>

<style scoped>
.status-tabs {
  margin-bottom: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  min-height: 120px;
}

.review-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pick {
  position: absolute;
  top: 12px;
  right: 12px;
}

.card-head {
  display: flex;
  gap: 8px;
}

.card-title {
  font-size: 16px;
}

.nick {
  color: #409eff;
}

.card-img {
  width: 100%;
  height: 110px;
  border-radius: 8px;
}

.origin {
  margin: 0;
  color: #606266;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meta {
  font-size: 12px;
  color: #909399;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
