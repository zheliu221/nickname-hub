<script setup lang="ts">
// 业务模块二（表单侧）：外号投稿页
// 步骤条表单 · 分步校验 · 角色列表按需加载 · 截图上传预览
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { http } from '@/apis/request'
import { useReviewStore } from '@/stores/review'
import { useUserStore } from '@/stores/user'
import type { Game } from '@/types'

const reviewStore = useReviewStore()
const userStore = useUserStore()

const step = ref(0)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const TAG_OPTIONS = ['官方称号', '谐音梗', '强度梗', '形象梗', '剧情梗', '技能梗', '玩法梗', '缩写梗', '系列梗']

const form = reactive({
  gameId: '',
  character: '',
  nickname: '',
  origin: '',
  tags: [] as string[],
  contributor: userStore.userInfo?.nickname ?? ''
})
const avatar = ref('') // 投稿上传的候选角色头像（审核通过后设为角色头像）

onMounted(async () => {
  games.value = await http.get<Game[]>('/games')
})

const games = ref<Game[]>([])

const rules: FormRules = {
  gameId: [{ required: true, message: '请选择游戏', trigger: 'change' }],
  character: [{ required: true, message: '请输入或选择角色', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入外号', trigger: 'blur' }]
}

// 子级数据按需加载：选完游戏才请求该游戏下的角色列表
const characters = ref<string[]>([])
const loadingCharacters = ref(false)
watch(
  () => form.gameId,
  async (id) => {
    characters.value = []
    form.character = ''
    if (!id) return
    loadingCharacters.value = true
    try {
      characters.value = await http.get<string[]>(`/games/${id}/characters`)
    } finally {
      loadingCharacters.value = false
    }
  }
)

const gameName = () => games.value.find((g) => g.id === form.gameId)?.name ?? ''

/** 下一步：校验当前步骤的表单项 */
async function next() {
  try {
    if (step.value === 0) await formRef.value?.validateField(['gameId', 'character'])
    else await formRef.value?.validateField(['nickname', 'origin'])
    step.value++
  } catch {
    /* 校验失败停留当前步 */
  }
}

/** 上一步 */
function prev() {
  step.value--
}

/** 选择截图：转成 dataURL 预览（前端本地处理） */
function onFileChange(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  if (raw.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => (avatar.value = reader.result as string)
  reader.readAsDataURL(raw)
}

function removeAvatar() {
  avatar.value = ''
}

/** 提交投稿 */
async function submit() {
  submitting.value = true
  try {
    await reviewStore.submit({ ...form, image: avatar.value || undefined })
    ElMessage.success('投稿成功！审核通过后将自动收录进外号库')
    step.value = 0
    Object.assign(form, { gameId: '', character: '', nickname: '', origin: '', tags: [] })
    avatar.value = ''
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <h2>我要投稿</h2>
    </div>

    <div class="nh-card contribute-card">
      <el-steps :active="step" align-center finish-status="success" class="steps">
        <el-step title="选择游戏与角色" />
        <el-step title="填写外号信息" />
        <el-step title="上传头像并提交" />
      </el-steps>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="form">
        <!-- 第一步 -->
        <template v-if="step === 0">
          <el-form-item label="所属游戏" prop="gameId">
            <el-select v-model="form.gameId" placeholder="请选择游戏" style="width: 100%">
              <el-option v-for="g in games" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="角色名" prop="character">
            <el-select
              v-model="form.character"
              filterable
              allow-create
              default-first-option
              :loading="loadingCharacters"
              placeholder="选择已有角色或直接输入新角色"
              style="width: 100%"
            >
              <el-option v-for="c in characters" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 第二步 -->
        <template v-if="step === 1">
          <el-form-item label="外号" prop="nickname">
            <el-input v-model="form.nickname" placeholder="如：帝君" />
          </el-form-item>
          <el-form-item label="外号由来" prop="origin">
            <el-input
              v-model="form.origin"
              type="textarea"
              :rows="4"
              placeholder="选填，说说这个外号的来历"
            />
          </el-form-item>
          <el-form-item label="外号标签">
            <el-select v-model="form.tags" multiple placeholder="选择外号类型" style="width: 100%">
              <el-option v-for="t in TAG_OPTIONS" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 第三步 -->
        <template v-if="step === 2">
          <el-alert type="info" :closable="false" class="summary">
            <p>
              <b>{{ gameName() }} · {{ form.character }}</b>
            </p>
            <p>外号「{{ form.nickname }}」</p>
            <p>由来：{{ form.origin }}</p>
          </el-alert>
          <el-form-item label="角色头像">
            <div v-if="avatar" class="preview-wrap">
              <el-image :src="avatar" fit="cover" class="preview" :preview-src-list="[avatar]" />
              <el-button text type="danger" @click="removeAvatar">移除头像</el-button>
            </div>
            <el-upload
              v-else
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onFileChange"
            >
              <el-button>
                <el-icon><Upload /></el-icon>&nbsp;选择图片（不超过 2MB）
              </el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="投稿人">
            <el-input v-model="form.contributor" style="width: 240px" />
          </el-form-item>
        </template>
      </el-form>

      <div class="step-actions">
        <el-button v-if="step > 0" @click="prev">上一步</el-button>
        <el-button v-if="step < 2" type="primary" @click="next">下一步</el-button>
        <el-button v-else type="primary" :loading="submitting" @click="submit">提交投稿</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contribute-card {
  max-width: 720px;
  margin: 0 auto;
}

.steps {
  margin-bottom: 28px;
}

.form {
  max-width: 560px;
  margin: 0 auto;
}

.summary p {
  margin: 4px 0;
}

.preview-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.preview {
  width: 260px;
  height: 140px;
  border-radius: 8px;
}

.step-actions {
  text-align: center;
  margin-top: 24px;
}
</style>
