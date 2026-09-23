<script setup lang="ts">
// 业务模块一：外号库列表页
// 表格布局 · 条件筛选 · 分页 · 弹窗新增/编辑 · 单条/批量删除 · CSV 导出
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useNicknameStore } from '@/stores/nickname'
import { exportCSV } from '@/utils/export'
import { formatHeat } from '@/utils/format'
import { http } from '@/apis/request'
import type { CharacterCard, Nickname, PageResult } from '@/types'

const store = useNicknameStore()
const router = useRouter()
const route = useRoute()

/** 标签选项（筛选与表单共用） */
const TAG_OPTIONS = ['官方称号', '谐音梗', '强度梗', '形象梗', '剧情梗', '技能梗', '玩法梗', '缩写梗', '系列梗']

// pageSize 含义：每页显示的角色卡片数
const query = reactive({ gameId: '', keyword: '', tag: '', page: 1, pageSize: 6 })
const selected = ref<Nickname[]>([])
/** 选中项 id 集合（卡片内复选框用） */
const selectedIds = computed(() => new Set(selected.value.map((i) => i.id)))

/** 切换某个外号的选中状态 */
function toggleSelect(item: Nickname) {
  const idx = selected.value.findIndex((i) => i.id === item.id)
  if (idx === -1) selected.value.push(item)
  else selected.value.splice(idx, 1)
}

/** 批量选择模式：点击"批量删除"按钮后开启，表格才显示复选框列 */
const isSelectMode = ref(false)
function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) selected.value = []
}

/** 展平当前页所有外号（跨卡片），用于全选 */
const currentPageNicks = computed<Nickname[]>(() =>
  store.cards.flatMap((c) => c.nicknames)
)

/** 是否全部选中（本页所有外号） */
const allSelected = computed(() =>
  currentPageNicks.value.length > 0 &&
  currentPageNicks.value.every((n) => selectedIds.value.has(n.id))
)

/** 全选 / 取消全选本页所有外号 */
function toggleSelectAll() {
  if (allSelected.value) {
    // 全选中 → 取消
    selected.value = []
  } else {
    // 非全选 → 全选（只补入当前页的）
    const others = selected.value.filter(
      (n) => !currentPageNicks.value.some((p) => p.id === n.id)
    )
    selected.value = [...others, ...currentPageNicks.value]
  }
}

/** 删除整个游戏（筛选在某游戏时可用，危险操作） */
async function onDeleteGame() {
  if (!query.gameId) return
  const gameNameStr = gameName(query.gameId)
  const count = currentPageNicks.value.length
  const ok = await ElMessageBox.confirm(
    `将删除「${gameNameStr}」下所有 ${count} 个外号、角色和头像，游戏记录本身也会移除。此操作不可恢复，确定继续吗？`,
    '删除整个游戏',
    { type: 'error', confirmButtonText: '确认删除整个游戏', cancelButtonText: '取消' }
  ).catch(() => false)
  if (!ok) return
  try {
    await store.removeGame(query.gameId)
    ElMessage.success(`已删除「${gameNameStr}」及其全部数据`)
    query.gameId = ''
    selected.value = []
    isSelectMode.value = false
    await store.fetchGames()
    await store.fetchCards(query)
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

onMounted(async () => {
  await store.fetchGames()
  syncGameFromRoute()
})

/** 查询 / 重置 */
async function search() {
  query.page = 1
  await store.fetchCards(query)
}

async function reset() {
  query.gameId = ''
  query.keyword = ''
  query.tag = ''
  // 若当前带游戏参数，跳回「全部外号」，由路由监听重新查询
  if (route.params.gameId) {
    router.push('/nicknames')
    return
  }
  await search()
}

/** 从路由读取游戏参数（侧边栏子菜单选择游戏后跳转进入） */
function syncGameFromRoute() {
  query.gameId = (route.params.gameId as string) || ''
  query.page = 1
  store.fetchCards(query)
}

// 组件被复用时路由参数变化（切换游戏）→ 重新按游戏查询
watch(
  () => route.params.gameId,
  () => {
    if (route.name === 'nicknames') syncGameFromRoute()
  }
)

/** 筛选区切换游戏时同步更新 URL，与侧边栏子菜单高亮保持一致 */
function onGameFilterChange() {
  const target = query.gameId ? `/nicknames/${query.gameId}` : '/nicknames'
  if (route.path !== target) router.push(target)
}

function gameName(id: string) {
  return store.games.find((g) => g.id === id)?.name ?? id
}

function gameColor(id: string) {
  return store.games.find((g) => g.id === id)?.color ?? '#909399'
}

/** 跳转角色详情页（卡片头部） */
function goCharacter(card: CharacterCard) {
  router.push(`/character/${card.gameId}/${encodeURIComponent(card.character)}`)
}

// ---------- 新增角色（第一步：先创建角色；外号在角色详情页添加） ----------
const charDialogVisible = ref(false)
const charFormRef = ref<FormInstance>()
const charForm = reactive({ gameId: '', character: '', image: '' })

const charRules: FormRules = {
  gameId: [{ required: true, message: '请选择所属游戏', trigger: 'change' }],
  character: [{ required: true, message: '请输入角色名', trigger: 'blur' }]
}

function openAddCharacter() {
  // 默认带上当前筛选的游戏，少一次选择
  Object.assign(charForm, { gameId: query.gameId, character: '', image: '' })
  charDialogVisible.value = true
}

/** 上传头像：本地读取为 dataURL 存储（与 mock 数据层保持一致，无需真实后端） */
function onAvatarChange(file: any) {
  const raw: File | undefined = file?.raw
  if (!raw) return
  if (!raw.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return
  }
  // localStorage 容量有限（约 5MB），超过 2MB 的图片直接拒绝
  if (raw.size > 2 * 1024 * 1024) {
    ElMessage.error('图片不能超过 2MB，请压缩后再上传')
    return
  }
  const reader = new FileReader()
  reader.onload = () => (charForm.image = String(reader.result))
  reader.readAsDataURL(raw)
}

/** 移除已选择的头像 */
function clearAvatar() {
  charForm.image = ''
}

async function submitCharForm() {
  const valid = await charFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const created = await store.addCharacter({ ...charForm })
    ElMessage.success('角色创建成功，接下来给它添加外号吧')
    charDialogVisible.value = false
    // 创建成功后直接进入角色详情页添加外号
    router.push(`/character/${created.gameId}/${encodeURIComponent(created.character)}`)
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 新增游戏 ----------
const gameDialogVisible = ref(false)
const gameFormRef = ref<FormInstance>()
const gameForm = reactive({ name: '', color: '#409eff' })
const gameRules: FormRules = {
  name: [{ required: true, message: '请输入游戏名称', trigger: 'blur' }]
}

function openAddGame() {
  Object.assign(gameForm, { name: '', color: '#409eff' })
  gameDialogVisible.value = true
}

async function submitGameForm() {
  const valid = await gameFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await store.addGame({ ...gameForm })
    ElMessage.success('新增游戏成功')
    gameDialogVisible.value = false
    // 刷新游戏列表：侧边栏子菜单、筛选下拉、表单下拉共用同一份数据，会同步更新
    await store.fetchGames()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 删除（高危操作，弹窗确认） ----------
async function onBatchDelete() {
  const ids = selected.value.map((r) => r.id)
  const ok = await ElMessageBox.confirm(
    `确定批量删除选中的 ${ids.length} 条外号吗？`,
    '批量删除确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  const count = await store.batchRemove(ids)
  ElMessage.success(`已删除 ${count} 条数据`)
  await store.fetchCards(query)
}

// ---------- 导出 CSV ----------
async function onExport() {
  // 导出当前筛选条件下的全部数据（不带分页限制）
  const res = await http.get<PageResult<Nickname>>('/nicknames', {
    ...query,
    page: 1,
    pageSize: 99999
  })
  exportCSV(
    `游戏角色外号库-${Date.now()}`,
    ['游戏', '角色', '外号', '外号由来', '标签', '热度', '投稿人', '收录日期'],
    res.list.map((i) => [
      gameName(i.gameId),
      i.character,
      i.nickname,
      i.origin,
      i.tags.join('、'),
      i.heat,
      i.contributor,
      i.createdAt
    ])
  )
  ElMessage.success(`已导出 ${res.total} 条数据`)
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <h2>外号库</h2>
      <div class="toolbar">
        <el-button type="primary" v-permission="'nicknames:add'" @click="openAddCharacter">
          <el-icon><Plus /></el-icon>&nbsp;新增角色
        </el-button>
        <el-button v-permission="'nicknames:add'" @click="openAddGame">
          <el-icon><CirclePlus /></el-icon>&nbsp;新增游戏
        </el-button>
        <el-button v-permission="'nicknames:export'" @click="onExport">
          <el-icon><Download /></el-icon>&nbsp;导出CSV
        </el-button>
        <el-button
          v-if="!isSelectMode"
          type="danger"
          plain
          v-permission="'nicknames:delete'"
          @click="toggleSelectMode"
        >
          <el-icon><Delete /></el-icon>&nbsp;批量删除
        </el-button>
        <el-button
          v-if="!isSelectMode && query.gameId"
          type="danger"
          plain
          v-permission="'nicknames:delete'"
          @click="onDeleteGame"
        >
          <el-icon><Delete /></el-icon>&nbsp;删除整个「{{ gameName(query.gameId) }}」
        </el-button>
        <el-button v-if="isSelectMode" @click="toggleSelectMode">
          退出选择
        </el-button>
        <el-button
          v-if="isSelectMode"
          :type="allSelected ? 'default' : 'primary'"
          plain
          @click="toggleSelectAll"
        >
          {{ allSelected ? '取消全选' : '全选本页' }} ({{ currentPageNicks.length }})
        </el-button>
        <el-button
          v-if="isSelectMode"
          type="danger"
          :disabled="selected.length === 0"
          v-permission="'nicknames:delete'"
          @click="onBatchDelete"
        >
          删除所选 ({{ selected.length }})
        </el-button>
      </div>
    </div>

    <div class="nh-card">
      <!-- 条件筛选区 -->
      <div class="filter-bar">
        <el-select
          v-model="query.gameId"
          placeholder="按游戏筛选"
          clearable
          style="width: 160px"
          @change="onGameFilterChange"
        >
          <el-option v-for="g in store.games" :key="g.id" :label="g.name" :value="g.id" />
        </el-select>
        <el-select v-model="query.tag" placeholder="按标签筛选" clearable style="width: 140px">
          <el-option v-for="t in TAG_OPTIONS" :key="t" :label="t" :value="t" />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="搜索角色 / 外号 / 由来"
          clearable
          style="width: 220px"
          @keyup.enter="search"
        />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <!-- 角色卡片：同一角色的所有外号归入一张卡片 -->
      <div v-loading="store.loading" class="card-grid">
        <div v-for="card in store.cards" :key="`${card.gameId}|${card.character}`" class="char-card">
          <!-- 卡片头：角色图片 + 角色名 + 游戏 + 外号数量 -->
          <div class="char-head">
            <el-avatar :size="48" :src="card.image || undefined" class="char-avatar">
              {{ card.character.slice(0, 1) }}
            </el-avatar>
            <div class="char-info">
              <el-link type="primary" :underline="false" class="char-name" @click="goCharacter(card)">
                {{ card.character }}
              </el-link>
              <div class="char-sub">
                <el-tag :color="gameColor(card.gameId)" size="small" style="color: #fff; border: none">
                  {{ gameName(card.gameId) }}
                </el-tag>
                <span class="char-count">{{ card.nicknames.length }} 个外号</span>
              </div>
            </div>
            <el-button link type="primary" @click="goCharacter(card)">
              详情 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>

          <!-- 卡片体：该角色的全部外号（新建角色可能还没有外号） -->
          <div class="nick-list">
            <div v-if="card.nicknames.length === 0" class="nick-empty">
              还没有外号，点右上角「详情」去添加
            </div>
            <div
              v-for="item in card.nicknames"
              :key="item.id"
              class="nick-entry"
              :class="{ 'is-selected': isSelectMode && selectedIds.has(item.id) }"
            >
              <el-checkbox
                v-if="isSelectMode"
                :model-value="selectedIds.has(item.id)"
                @change="toggleSelect(item)"
              />
              <div class="nick-main">
                <div class="nick-line">
                  <b class="nick-name">{{ item.nickname }}</b>
                  <el-tag v-for="t in item.tags" :key="t" size="small" type="info">{{ t }}</el-tag>
                  <span class="heat">{{ formatHeat(item.heat) }}</span>
                </div>
                <p class="nick-origin">{{ item.origin || '暂无由来' }}</p>
                <p class="nick-meta">{{ item.contributor }} · {{ item.createdAt }}</p>
              </div>
            </div>
          </div>
        </div>

        <el-empty
          v-if="!store.loading && store.cards.length === 0"
          description="暂无外号数据"
          class="grid-empty"
        />
      </div>

      <!-- 分页（按角色卡片分页） -->
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="store.cardTotal"
          :page-sizes="[4, 6, 8, 12]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="store.fetchCards(query)"
          @size-change="search"
        />
      </div>
    </div>

    <!-- 新增角色弹窗：第一步先建角色，外号到详情页添加 -->
    <el-dialog v-model="charDialogVisible" title="新增角色" width="480px">
      <el-alert
        type="info"
        :closable="false"
        title="先创建角色，创建后会进入角色详情页，在那里添加它的外号"
        style="margin-bottom: 16px"
      />
      <el-form ref="charFormRef" :model="charForm" :rules="charRules" label-width="90px">
        <el-form-item label="所属游戏" prop="gameId">
          <el-select v-model="charForm.gameId" placeholder="请选择游戏" style="width: 100%">
            <el-option v-for="g in store.games" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色名" prop="character">
          <el-input v-model="charForm.character" placeholder="如：钟离" />
        </el-form-item>
        <el-form-item label="角色头像">
          <div class="img-upload">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onAvatarChange"
            >
              <el-button>
                <el-icon><Upload /></el-icon>&nbsp;{{ charForm.image ? '重新上传' : '上传头像' }}
              </el-button>
            </el-upload>
            <span class="img-tip">可选，同一角色的所有外号共用，2MB 以内</span>
          </div>
          <el-image
            v-if="charForm.image"
            :src="charForm.image"
            :preview-src-list="[charForm.image]"
            fit="cover"
            class="img-preview"
          />
          <el-button v-if="charForm.image" link type="danger" size="small" @click="clearAvatar">
            移除头像
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="charDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCharForm">创建并进入详情页</el-button>
      </template>
    </el-dialog>

    <!-- 新增游戏弹窗 -->
    <el-dialog v-model="gameDialogVisible" title="新增游戏" width="420px">
      <el-form ref="gameFormRef" :model="gameForm" :rules="gameRules" label-width="90px">
        <el-form-item label="游戏名称" prop="name">
          <el-input v-model="gameForm.name" placeholder="如：崩坏3" maxlength="20" />
        </el-form-item>
        <el-form-item label="主题颜色">
          <el-color-picker v-model="gameForm.color" />
          <span class="color-tip">用于列表中游戏标签的显示颜色</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="gameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGameForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 0;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.tag-item {
  margin-right: 6px;
}

/* 角色卡片网格：自适应两列/单列 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
  gap: 16px;
  min-height: 120px;
}

.char-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px 16px;
  transition: box-shadow 0.2s;
}

.char-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.char-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #ebeef5;
}

.char-avatar {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  font-size: 20px;
  flex-shrink: 0;
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name {
  font-size: 16px;
  font-weight: bold;
}

.char-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.char-count {
  font-size: 12px;
  color: #909399;
}

.nick-list {
  margin-top: 6px;
}

.nick-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 8px;
}

.nick-entry + .nick-entry {
  border-top: 1px solid #f5f7fa;
}

.nick-entry.is-selected {
  background: #fdf6ec;
}

.nick-main {
  flex: 1;
  min-width: 0;
}

.nick-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nick-name {
  font-size: 14px;
}

.heat {
  margin-left: auto;
  color: #e6a23c;
  font-size: 12px;
}

.nick-origin {
  margin: 4px 0 0;
  font-size: 12px;
  color: #606266;
}

.nick-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: #c0c4cc;
}

.nick-empty {
  padding: 14px 8px;
  font-size: 13px;
  color: #c0c4cc;
  text-align: center;
}

.grid-empty {
  grid-column: 1 / -1;
}

.color-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.img-upload {
  display: flex;
  align-items: center;
  gap: 10px;
}

.img-tip {
  font-size: 12px;
  color: #909399;
}

.img-preview {
  width: 160px;
  height: 90px;
  margin-top: 8px;
  border-radius: 6px;
  display: block;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
