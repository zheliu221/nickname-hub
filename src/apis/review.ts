// 投稿审核接口：投稿、审核、采纳、删除
import { mock } from './request'
import {
  getCharacters,
  getContributions,
  getNicknames,
  nextId,
  setCharacters,
  setContributions,
  setNicknames
} from './mockdb'
import type { Contribution } from '@/types'

/** GET /contributions 投稿分页列表（可按状态筛选） */
mock('GET', '/contributions', ({ query }) => {
  const { status = '', page = 1, pageSize = 9 } = query
  let list = getContributions()
  if (status) list = list.filter((i) => i.status === status)
  const total = list.length
  const start = (Number(page) - 1) * Number(pageSize)
  return { list: list.slice(start, start + Number(pageSize)), total }
})

/** POST /contributions 提交投稿 */
mock('POST', '/contributions', ({ body }) => {
  const list = getContributions()
  const item: Contribution = {
    ...body,
    id: nextId(),
    status: 'pending',
    heat: 0,
    createdAt: new Date().toISOString().slice(0, 10)
  }
  // 合法性校验：正式库或投稿池中不允许重复外号
  const dupN = getNicknames().some(
    (i) => i.gameId === item.gameId && i.character === item.character && i.nickname === item.nickname
  )
  const dupC = list.some(
    (i) =>
      i.status === 'pending' &&
      i.gameId === item.gameId &&
      i.character === item.character &&
      i.nickname === item.nickname
  )
  if (dupN) throw new Error('外号库中已收录该外号，无需投稿')
  if (dupC) throw new Error('该外号已在待审核列表中，请耐心等待')
  list.unshift(item)
  setContributions(list)
  return item
})

/** PUT /contributions/:id/audit 审核：通过则自动采纳入外号库 */
mock('PUT', '/contributions/:id/audit', ({ params, body }) => {
  const list = getContributions()
  const item = list.find((i) => i.id === Number(params.id))
  if (!item) throw new Error('投稿不存在')
  if (item.status !== 'pending') throw new Error('该投稿已处理过，请勿重复审核')
  item.status = body.status
  setContributions(list)

  // 审核通过：采纳进外号正式库
  if (body.status === 'approved') {
    const { status: _ignored, image: _img, ...rest } = item
    const newId = nextId()
    const nicks = getNicknames()
    nicks.unshift({ ...rest, id: newId, heat: 0 })
    setNicknames(nicks)

    // 投稿涉及的角色：不存在则自动创建（角色为独立实体），候选头像设为角色头像
    const chars = getCharacters()
    const idx = chars.findIndex(
      (c) => c.gameId === item.gameId && c.character === item.character
    )
    if (idx === -1) {
      chars.unshift({
        id: nextId(),
        gameId: item.gameId,
        character: item.character,
        image: item.image ?? ''
      })
    } else if (item.image) {
      chars[idx].image = item.image
    }
    setCharacters(chars)
  }
  return item
})

/** DELETE /contributions/:id 单条删除 */
mock('DELETE', '/contributions/:id', ({ params }) => {
  const id = Number(params.id)
  setContributions(getContributions().filter((i) => i.id !== id))
  return true
})

/** POST /contributions/batch-delete 批量删除 */
mock('POST', '/contributions/batch-delete', ({ body }) => {
  const ids: number[] = body.ids
  setContributions(getContributions().filter((i) => !ids.includes(i.id)))
  return ids.length
})
