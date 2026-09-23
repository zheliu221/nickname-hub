// 外号库仓库：角色 / 游戏 / 外号增删改（业务模块一）
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/apis/request'
import type { Character, CharacterCard, Game, Nickname, NicknameQuery, PageResult } from '@/types'

export const useNicknameStore = defineStore('nickname', () => {
  const games = ref<Game[]>([])
  const cards = ref<CharacterCard[]>([]) // 按角色聚合的卡片列表
  const cardTotal = ref(0) // 卡片（角色）总数
  const loading = ref(false)

  /** 游戏列表（下拉筛选用） */
  async function fetchGames() {
    games.value = await http.get<Game[]>('/games')
  }

  /** 新增游戏（成功后调用 fetchGames 即可刷新侧边栏子菜单与筛选下拉） */
  async function addGame(data: { name: string; color: string }) {
    await http.post<Game>('/games', data)
  }

  /** 创建角色（新增流程第一步：创建成功后跳转角色详情页添加外号） */
  async function addCharacter(data: { gameId: string; character: string; image?: string }) {
    return http.post<Character>('/characters', data)
  }

  /** 条件查询 + 按角色聚合分页（卡片列表） */
  async function fetchCards(query: NicknameQuery) {
    loading.value = true
    try {
      const res = await http.get<PageResult<CharacterCard>>('/nicknames/grouped', { ...query })
      cards.value = res.list
      cardTotal.value = res.total
    } finally {
      loading.value = false
    }
  }

  async function add(data: Partial<Nickname>) {
    await http.post<Nickname>('/nicknames', data)
  }

  async function update(id: number, data: Partial<Nickname>) {
    await http.put<Nickname>(`/nicknames/${id}`, data)
  }

  async function remove(id: number) {
    await http.delete(`/nicknames/${id}`)
  }

  async function batchRemove(ids: number[]) {
    return http.post<number>('/nicknames/batch-delete', { ids })
  }

  /** 删除整个游戏（角色 + 外号 + 头像 + 游戏记录一并移除） */
  async function removeGame(gameId: string) {
    await http.delete(`/games/${gameId}`)
  }

  return { games, cards, cardTotal, loading, fetchGames, addGame, removeGame, addCharacter, fetchCards, add, update, remove, batchRemove }
})
