// 模拟数据库：localStorage 充当数据表，首次访问时写入种子数据
import { load, save } from '@/utils/storage'
import { SEED_CHARACTERS, SEED_CONTRIBUTIONS, SEED_GAMES, SEED_NICKNAMES, SEED_ROLES, SEED_USERS } from '@/data/seed'
import type { Character, Contribution, Game, Nickname, RoleItem, UserItem } from '@/types'

/** 取一张"表"：没有数据时用种子初始化 */
function table<T>(key: string, seed: T[]): T[] {
  const cached = load<T[] | null>(key, null)
  if (cached === null) {
    save(key, seed)
    return seed
  }
  return cached
}

export const getGames = () => table('games', SEED_GAMES)
export const setGames = (g: Game[]) => save('games', g)

export const getUsers = () => table('users', SEED_USERS)
export const setUsers = (u: UserItem[]) => save('users', u)

export const getRoles = () => table('roles', SEED_ROLES)
export const setRoles = (r: RoleItem[]) => save('roles', r)

export const getNicknames = () => table('nicknames', SEED_NICKNAMES)
export const setNicknames = (n: Nickname[]) => save('nicknames', n)

export const getContributions = () => table('contributions', SEED_CONTRIBUTIONS)
export const setContributions = (c: Contribution[]) => save('contributions', c)

/** 角色表：独立实体（新增流程：先创建角色，再在详情页添加外号） */
export const getCharacters = () => table('characters', SEED_CHARACTERS)
export const setCharacters = (list: Character[]) => save('characters', list)

/** 生成自增 id：取三张表的最大 id + 1 */
export function nextId(): number {
  const ids = [...getNicknames(), ...getContributions(), ...getCharacters()].map((i) => i.id)
  return ids.length ? Math.max(...ids) + 1 : 1
}
