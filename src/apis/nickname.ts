// 外号库接口：角色管理、列表查询、按需加载、增删改、批量删除、统计
import { mock } from './request'
import {
  getCharacters, getContributions, getGames, getNicknames,
  nextId, setCharacters, setGames, setNicknames
} from './mockdb'
import type { Character, CharacterCard, Game, Nickname } from '@/types'

/** GET /games 游戏列表 */
mock('GET', '/games', () => getGames())

/** POST /games 新增游戏 */
mock('POST', '/games', ({ body }) => {
  const games = getGames()
  const name = String(body.name || '').trim()
  if (!name) throw new Error('请填写游戏名称')
  // 合法性校验：游戏名不允许重复
  if (games.some((g) => g.name === name)) throw new Error('该游戏已存在')
  const game: Game = { id: 'g' + Date.now(), name, color: body.color || '#409eff' }
  games.push(game)
  setGames(games)
  return game
})

/** POST /characters 创建角色（新增流程第一步：先建角色，再进详情页添加外号） */
mock('POST', '/characters', ({ body }) => {
  const gameId = String(body.gameId || '')
  const character = String(body.character || '').trim()
  if (!gameId) throw new Error('请选择所属游戏')
  if (!character) throw new Error('请填写角色名')
  const list = getCharacters()
  // 合法性校验：同一游戏下角色名不允许重复
  if (list.some((c) => c.gameId === gameId && c.character === character)) {
    throw new Error('该游戏下已存在此角色')
  }
  const item: Character = { id: nextId(), gameId, character, image: body.image || '' }
  list.unshift(item)
  setCharacters(list)
  return item
})

/** GET /character-image 获取角色头像（角色级：读写角色表） */
mock('GET', '/character-image', ({ query }) => {
  const { gameId = '', character = '' } = query
  const hit = getCharacters().find((i) => i.gameId === gameId && i.character === character)
  return hit?.image ?? ''
})

/** PUT /character-image 保存/移除角色头像（image 为空串表示移除） */
mock('PUT', '/character-image', ({ body }) => {
  const { gameId, character, image } = body
  const list = getCharacters()
  const idx = list.findIndex((i) => i.gameId === gameId && i.character === character)
  if (idx === -1) throw new Error('角色不存在')
  list[idx].image = image || ''
  setCharacters(list)
  return true
})

/** GET /nicknames 外号分页列表：条件筛选 + 排序 + 分页都在"服务端"完成 */
mock('GET', '/nicknames', ({ query }) => {
  const { gameId = '', keyword = '', tag = '', page = 1, pageSize = 10 } = query
  const kw = String(keyword).trim().toLowerCase()

  let list = getNicknames()
  if (gameId) list = list.filter((i) => i.gameId === gameId)
  if (tag) list = list.filter((i) => i.tags.includes(tag))
  if (kw) {
    list = list.filter((i) =>
      [i.character, i.nickname, i.origin].some((f) => f.toLowerCase().includes(kw))
    )
  }

  // 按热度倒序
  list = [...list].sort((a, b) => b.heat - a.heat)

  const total = list.length
  const start = (Number(page) - 1) * Number(pageSize)
  return { list: list.slice(start, start + Number(pageSize)), total }
})

/** GET /nicknames/grouped 按角色聚合的卡片列表：以角色表为基准，外号挂角色下，按角色分页 */
mock('GET', '/nicknames/grouped', ({ query }) => {
  const { gameId = '', keyword = '', tag = '', page = 1, pageSize = 6 } = query
  const kw = String(keyword).trim().toLowerCase()

  // 1. 角色表为基准，组装卡片（角色的全部外号，组内按热度倒序）
  let chars = getCharacters()
  if (gameId) chars = chars.filter((c) => c.gameId === gameId)
  const nicks = getNicknames()
  let cards: CharacterCard[] = chars.map((c) => ({
    gameId: c.gameId,
    character: c.character,
    image: c.image,
    nicknames: nicks
      .filter((i) => i.gameId === c.gameId && i.character === c.character)
      .sort((a, b) => b.heat - a.heat)
  }))

  // 2. 关键词/标签筛选：仅保留外号能匹配上的角色（角色名也参与关键词匹配）
  if (kw) {
    cards = cards.filter(
      (c) =>
        c.character.toLowerCase().includes(kw) ||
        c.nicknames.some((i) =>
          [i.nickname, i.origin].some((f) => f.toLowerCase().includes(kw))
        )
    )
  }
  if (tag) cards = cards.filter((c) => c.nicknames.some((i) => i.tags.includes(tag)))

  // 3. 卡片按角色最高热度倒序
  cards.sort(
    (a, b) =>
      Math.max(0, ...b.nicknames.map((i) => i.heat)) -
      Math.max(0, ...a.nicknames.map((i) => i.heat))
  )

  // 4. 按卡片（角色）分页
  const total = cards.length
  const start = (Number(page) - 1) * Number(pageSize)
  return { list: cards.slice(start, start + Number(pageSize)), total }
})

/** GET /nicknames/character 按需加载：某角色的全部外号（详情页子数据） */
mock('GET', '/nicknames/character', ({ query }) => {
  const { gameId = '', character = '' } = query
  return getNicknames()
    .filter((i) => i.gameId === gameId && i.character === character)
    .sort((a, b) => b.heat - a.heat)
})

/** GET /games/:id/characters 按需加载：某游戏下的角色名列表（投稿页选择角色） */
mock('GET', '/games/:id/characters', ({ params }) => {
  return getCharacters()
    .filter((c) => c.gameId === params.id)
    .map((c) => c.character)
})

/** POST /nicknames 新增外号 */
mock('POST', '/nicknames', ({ body }) => {
  const list = getNicknames()
  const item: Nickname = {
    ...body,
    id: nextId(),
    heat: Number(body.heat) || 0,
    createdAt: body.createdAt || new Date().toISOString().slice(0, 10)
  }
  // 合法性校验：同一游戏同一角色不允许重复外号
  const dup = list.some(
    (i) => i.gameId === item.gameId && i.character === item.character && i.nickname === item.nickname
  )
  if (dup) throw new Error('该角色下已存在相同外号，请勿重复添加')
  list.unshift(item)
  setNicknames(list)
  // 外号必须挂在角色下：角色不存在时自动补建（保证列表聚合不丢数据）
  const chars = getCharacters()
  if (!chars.some((c) => c.gameId === item.gameId && c.character === item.character)) {
    chars.unshift({ id: nextId(), gameId: item.gameId, character: item.character, image: '' })
    setCharacters(chars)
  }
  return item
})

/** PUT /nicknames/:id 编辑外号 */
mock('PUT', '/nicknames/:id', ({ params, body }) => {
  const list = getNicknames()
  const idx = list.findIndex((i) => i.id === Number(params.id))
  if (idx === -1) throw new Error('外号不存在')
  list[idx] = { ...list[idx], ...body, id: list[idx].id }
  setNicknames(list)
  return list[idx]
})

/** DELETE /nicknames/:id 单条删除 */
mock('DELETE', '/nicknames/:id', ({ params }) => {
  const id = Number(params.id)
  setNicknames(getNicknames().filter((i) => i.id !== id))
  return true
})

/** POST /nicknames/batch-delete 批量删除 */
mock('POST', '/nicknames/batch-delete', ({ body }) => {
  const ids: number[] = body.ids
  setNicknames(getNicknames().filter((i) => !ids.includes(i.id)))
  return ids.length
})

/** DELETE /games/:id 删除整个游戏（该游戏下所有角色、外号、角色头像、游戏记录一并移除） */
mock('DELETE', '/games/:id', ({ params }) => {
  const gameId = String(params.id)
  const games = getGames()
  if (!games.some((g) => g.id === gameId)) throw new Error('游戏不存在')
  setGames(games.filter((g) => g.id !== gameId))
  setCharacters(getCharacters().filter((c) => c.gameId !== gameId))
  setNicknames(getNicknames().filter((n) => n.gameId !== gameId))
  return true
})

/** GET /stats 仪表盘统计数据 */
mock('GET', '/stats', () => {
  const nicks = getNicknames()
  const games = getGames()
  const contribs = getContributions()

  // 各游戏外号数量（柱状图）
  const byGame = games.map((g) => ({
    name: g.name,
    value: nicks.filter((n) => n.gameId === g.id).length
  }))

  // 标签分布（饼图，取前 6）
  const tagCount: Record<string, number> = {}
  nicks.forEach((n) => n.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)))
  const byTag = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const today = new Date().toISOString().slice(0, 10)
  return {
    total: nicks.length,
    gameCount: games.length,
    pendingCount: contribs.filter((c) => c.status === 'pending').length,
    todayCount: nicks.filter((n) => n.createdAt === today).length,
    byGame,
    byTag,
    latest: [...nicks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  }
})
