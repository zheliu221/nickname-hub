<script setup lang="ts">
// 角色详情页：头部信息 + 编辑角色头像 + 添加/编辑/删除外号（新增流程：先建角色，在这里补全内容）
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { http } from '@/apis/request'
import { useUserStore } from '@/stores/user'
import { useNicknameStore } from '@/stores/nickname'
import { formatHeat } from '@/utils/format'
import type { Game, Nickname } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const store = useNicknameStore()

const games = ref<Game[]>([])
const all = ref<Nickname[]>([]) // 该角色的全部外号
const headerImg = ref('') // 角色头像（角色级）
const visibleCount = ref(4) // 按需加载：先展示 4 条，点击加载更多
const loading = ref(false)

const gameId = computed(() => route.params.gameId as string)
const character = computed(() => decodeURIComponent(route.params.character as string))

const gameInfo = computed(() => games.value.find((g) => g.id === gameId.value))

/** 按需加载：进入详情页后才请求该角色的外号列表与头像 */
async function loadCharacterNicknames() {
  loading.value = true
  try {
    all.value = await http.get<Nickname[]>('/nicknames/character', {
      gameId: gameId.value,
      character: character.value
    })
    headerImg.value = await http.get<string>('/character-image', {
      gameId: gameId.value,
      character: character.value
    })
    visibleCount.value = 4
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  games.value = await http.get<Game[]>('/games')
  await loadCharacterNicknames()
})

// 详情页之间跳转时组件会复用，监听参数变化重新加载
watch(() => route.params, () => {
  if (route.name === 'character') loadCharacterNicknames()
})

const shown = computed(() => all.value.slice(0, visibleCount.value))
const maxHeat = computed(() => Math.max(0, ...all.value.map((i) => i.heat)))

// ---------- 编辑角色头像 ----------
const charDialogVisible = ref(false)
const charAvatar = ref('')

function openEditCharacter() {
  charAvatar.value = headerImg.value
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
  reader.onload = () => (charAvatar.value = String(reader.result))
  reader.readAsDataURL(raw)
}

function clearAvatar() {
  charAvatar.value = ''
}

async function submitCharacter() {
  try {
    await http.put('/character-image', {
      gameId: gameId.value,
      character: character.value,
      image: charAvatar.value
    })
    headerImg.value = charAvatar.value
    charDialogVisible.value = false
    ElMessage.success('角色头像已更新')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 添加 / 编辑外号（复用同一个弹窗表单） ----------
const TAG_OPTIONS = ['官方称号', '谐音梗', '强度梗', '形象梗', '剧情梗', '技能梗', '玩法梗', '缩写梗', '系列梗']

const nickDialogVisible = ref(false)
const isEditNick = ref(false)
const editingNickId = ref(0)
const nickFormRef = ref<FormInstance>()
const nickForm = reactive({ nickname: '', origin: '', tags: [] as string[] })

const nickRules: FormRules = {
  nickname: [{ required: true, message: '请输入外号', trigger: 'blur' }]
}

function openAddNick() {
  isEditNick.value = false
  Object.assign(nickForm, { nickname: '', origin: '', tags: [] })
  nickDialogVisible.value = true
}

function openEditNick(item: Nickname) {
  isEditNick.value = true
  editingNickId.value = item.id
  Object.assign(nickForm, { nickname: item.nickname, origin: item.origin, tags: [...item.tags] })
  nickDialogVisible.value = true
}

async function submitNickForm() {
  const valid = await nickFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    if (isEditNick.value) {
      await store.update(editingNickId.value, { ...nickForm })
      ElMessage.success('修改成功')
    } else {
      await store.add({
        gameId: gameId.value,
        character: character.value,
        ...nickForm,
        heat: 0,
        contributor: userStore.userInfo?.nickname || '后台录入'
      })
      ElMessage.success('外号添加成功')
    }
    nickDialogVisible.value = false
    await loadCharacterNicknames()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

// ---------- 删除外号（高危操作，弹窗确认） ----------
async function onDeleteNick(item: Nickname) {
  const ok = await ElMessageBox.confirm(
    `确定删除外号「${item.nickname}」吗？`,
    '删除确认',
    { type: 'warning' }
  ).catch(() => false)
  if (!ok) return
  await store.remove(item.id)
  ElMessage.success('删除成功')
  await loadCharacterNicknames()
}
</script>

<template>
  <div class="page">
    <!-- 返回 -->
    <el-button :icon="'ArrowLeft'" text @click="router.back()">返回</el-button>

    <!-- 角色头部信息 -->
    <div class="nh-card header-card">
      <el-avatar :size="64" :src="headerImg || undefined" class="avatar">{{ character.slice(0, 1) }}</el-avatar>
      <div class="info">
        <div class="name-line">
          <h1>{{ character }}</h1>
          <el-tag v-if="gameInfo" :color="gameInfo.color" style="color: #fff; border: none">
            {{ gameInfo.name }}
          </el-tag>
        </div>
        <p class="sub">
          共收录 {{ all.length }} 个外号 · 最高热度 {{ formatHeat(maxHeat) }}
        </p>
      </div>
      <el-button
        v-permission="'nicknames:edit'"
        :icon="'Edit'"
        plain
        @click="openEditCharacter"
      >
        编辑角色
      </el-button>
    </div>

    <!-- 外号时间线（子级数据，按需加载） -->
    <div class="nh-card">
      <div class="card-title">
        <h3>外号一览</h3>
        <el-button
          type="primary"
          size="small"
          v-permission="'nicknames:add'"
          @click="openAddNick"
        >
          <el-icon><Plus /></el-icon>&nbsp;添加外号
        </el-button>
      </div>
      <el-empty v-if="!loading && all.length === 0" description="该角色还没有外号，点击右上角「添加外号」" />
      <el-timeline v-else v-loading="loading" style="padding-left: 6px">
        <el-timeline-item
          v-for="item in shown"
          :key="item.id"
          :timestamp="`${item.contributor} · ${item.createdAt}`"
          placement="top"
          type="primary"
        >
          <div class="nick-item">
            <div class="nick-head">
              <b class="nick-name">{{ item.nickname }}</b>
              <el-tag v-for="t in item.tags" :key="t" size="small" type="info">{{ t }}</el-tag>
              <span class="heat">热度 {{ formatHeat(item.heat) }}</span>
              <span class="nick-ops">
                <el-button link type="primary" v-permission="'nicknames:edit'" @click="openEditNick(item)">
                  编辑
                </el-button>
                <el-button link type="danger" v-permission="'nicknames:delete'" @click="onDeleteNick(item)">
                  删除
                </el-button>
              </span>
            </div>
            <p class="origin">{{ item.origin || '暂无由来' }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>

      <div v-if="visibleCount < all.length" class="load-more">
        <el-button @click="visibleCount += 4">
          加载更多外号（剩余 {{ all.length - visibleCount }} 条）
        </el-button>
      </div>
    </div>

    <!-- 编辑角色弹窗（头像） -->
    <el-dialog v-model="charDialogVisible" title="编辑角色" width="460px">
      <el-form label-width="90px">
        <el-form-item label="所属游戏">
          <el-tag v-if="gameInfo" :color="gameInfo.color" style="color: #fff; border: none">
            {{ gameInfo.name }}
          </el-tag>
        </el-form-item>
        <el-form-item label="角色名">
          <el-input :model-value="character" disabled />
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
                <el-icon><Upload /></el-icon>&nbsp;{{ charAvatar ? '重新上传' : '上传头像' }}
              </el-button>
            </el-upload>
            <span class="img-tip">同一角色的所有外号共用，2MB 以内</span>
          </div>
          <el-image
            v-if="charAvatar"
            :src="charAvatar"
            :preview-src-list="[charAvatar]"
            fit="cover"
            class="img-preview"
          />
          <el-button v-if="charAvatar" link type="danger" size="small" @click="clearAvatar">
            移除头像
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="charDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCharacter">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加 / 编辑外号弹窗（表单复用） -->
    <el-dialog v-model="nickDialogVisible" :title="isEditNick ? '编辑外号' : '添加外号'" width="480px">
      <el-form ref="nickFormRef" :model="nickForm" :rules="nickRules" label-width="90px">
        <el-form-item label="角色">
          <el-input :model-value="character" disabled />
        </el-form-item>
        <el-form-item label="外号" prop="nickname">
          <el-input v-model="nickForm.nickname" placeholder="如：帝君" />
        </el-form-item>
        <el-form-item label="外号由来" prop="origin">
          <el-input v-model="nickForm.origin" type="textarea" :rows="3" placeholder="选填，说说这个外号是怎么来的" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="nickForm.tags" multiple placeholder="选择外号类型" style="width: 100%">
            <el-option v-for="t in TAG_OPTIONS" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nickDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNickForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.header-card {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 12px 0 16px;
}

.avatar {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  font-size: 28px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-line h1 {
  margin: 0;
  font-size: 24px;
}

.sub {
  margin: 6px 0 0;
  color: #909399;
  font-size: 13px;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.nick-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
}

.nick-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nick-name {
  font-size: 15px;
}

.heat {
  color: #e6a23c;
  font-size: 13px;
}

.nick-ops {
  margin-left: auto;
  white-space: nowrap;
}

.origin {
  margin: 8px 0 0;
  color: #606266;
  font-size: 13px;
}

.load-more {
  text-align: center;
  margin-top: 8px;
}

.img-upload {
  display: flex;
  align-items: center;
  gap: 10px;
}

.img-tip {
  font-size: 12px;
  color: #c0c4cc;
}

.img-preview {
  width: 160px;
  height: 90px;
  border-radius: 8px;
  margin-top: 10px;
  display: block;
}
</style>
