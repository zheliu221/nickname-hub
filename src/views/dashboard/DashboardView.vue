<script setup lang="ts">
// 首页仪表盘：统计卡片 + ECharts 图表（各游戏外号数量 / 标签分布）+ 最近收录
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { http } from '@/apis/request'
import { formatHeat } from '@/utils/format'
import type { Nickname } from '@/types'

interface Stats {
  total: number
  gameCount: number
  pendingCount: number
  todayCount: number
  byGame: { name: string; value: number }[]
  byTag: { name: string; value: number }[]
  latest: Nickname[]
}

const router = useRouter()
const stats = ref<Stats | null>(null)

const barRef = ref<HTMLElement>()
const pieRef = ref<HTMLElement>()
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const statCards = computed(() => [
  { label: '收录外号', value: stats.value?.total ?? '-', color: '#409eff', icon: 'Collection' },
  { label: '收录游戏', value: stats.value?.gameCount ?? '-', color: '#67c23a', icon: 'Platform' },
  { label: '待审投稿', value: stats.value?.pendingCount ?? '-', color: '#e6a23c', icon: 'Bell' },
  { label: '今日新增', value: stats.value?.todayCount ?? '-', color: '#f56c6c', icon: 'TrendCharts' }
])

onMounted(async () => {
  stats.value = await http.get<Stats>('/stats')
  renderCharts()
  window.addEventListener('resize', resizeCharts)
})

/** 渲染两个图表 */
function renderCharts() {
  if (!stats.value) return

  // 柱状图：各游戏外号数量
  barChart = echarts.init(barRef.value!)
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: stats.value.byGame.map((i) => i.name) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'bar',
        barWidth: 42,
        data: stats.value.byGame.map((i) => i.value),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#6d8dff' },
            { offset: 1, color: '#409eff' }
          ])
        }
      }
    ]
  })

  // 饼图：外号标签分布
  pieChart = echarts.init(pieRef.value!)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        data: stats.value.byTag,
        label: { formatter: '{b} {c}' }
      }
    ]
  })
}

function resizeCharts() {
  barChart?.resize()
  pieChart?.resize()
}

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  barChart?.dispose()
  pieChart?.dispose()
})

/** 跳转角色详情 */
function goDetail(item: Nickname) {
  router.push(`/character/${item.gameId}/${encodeURIComponent(item.character)}`)
}
</script>

<template>
  <div class="page">
    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="c in statCards" :key="c.label" class="stat-card nh-card">
        <el-icon :size="36" :color="c.color"><component :is="c.icon" /></el-icon>
        <div>
          <div class="stat-value">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <el-row :gutter="16" class="charts">
      <el-col :xs="24" :md="14">
        <div class="nh-card">
          <h3>各游戏收录外号数</h3>
          <div ref="barRef" class="chart" />
        </div>
      </el-col>
      <el-col :xs="24" :md="10">
        <div class="nh-card">
          <h3>外号标签分布</h3>
          <div ref="pieRef" class="chart" />
        </div>
      </el-col>
    </el-row>

    <!-- 最近收录 -->
    <div class="nh-card">
      <h3>最近收录</h3>
      <el-table :data="stats?.latest ?? []" size="large">
        <el-table-column label="角色" prop="character" width="140" />
        <el-table-column label="外号" prop="nickname" width="140" />
        <el-table-column label="外号由来" prop="origin" show-overflow-tooltip />
        <el-table-column label="热度" width="100">
          <template #default="{ row }">{{ formatHeat(row.heat) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-link type="primary" @click="goDetail(row)">查看详情</el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-value {
  font-size: 26px;
  font-weight: bold;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.charts {
  margin: 16px 0;
}

.chart {
  height: 300px;
}

h3 {
  margin: 0 0 12px;
  font-size: 16px;
}
</style>
