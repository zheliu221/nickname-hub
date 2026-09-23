// 全局 TypeScript 类型定义
// 统一约束项目中的数据结构，体现 TS 类型约束

/** 游戏信息 */
export interface Game {
  id: string
  name: string
  color: string // 游戏主题色，用于标签展示
}

/** 角色（独立实体：先创建角色，外号挂在角色下） */
export interface Character {
  id: number
  gameId: string
  character: string
  image: string // 角色头像（dataURL，可为空）
}

/** 审核状态：待审核 / 已通过 / 已拒绝 */
export type AuditStatus = 'pending' | 'approved' | 'rejected'

/** 外号条目（投稿审核通过后进入外号库） */
export interface Nickname {
  id: number
  gameId: string // 所属游戏 id
  character: string // 角色名
  nickname: string // 外号
  origin: string // 外号由来
  tags: string[] // 标签：谐音梗 / 强度梗 / 剧情梗 等
  heat: number // 热度值
  contributor: string // 投稿人
  createdAt: string // 创建日期
}

/** 投稿条目（结构与外号一致，多一个审核状态） */
export interface Contribution extends Nickname {
  status: AuditStatus
  image?: string // 投稿上传的候选角色头像（审核通过后设为角色头像，角色级）
}

/** 用户信息 */
export interface UserItem {
  username: string
  password: string
  nickname: string
  roles: string[] // 拥有的角色 id 列表
  avatar?: string // 头像（dataURL）
}

/** 角色信息（RBAC 中的角色） */
export interface RoleItem {
  id: string
  name: string
  desc: string
  permissions: string[] // 权限点列表
}

/** 权限树节点 */
export interface PermissionNode {
  key: string
  label: string
  children?: PermissionNode[]
}

/** 登录返回结果 */
export interface LoginResult {
  token: string
  userInfo: UserItem
}

/** 分页查询结果 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** 角色卡片（列表页按角色聚合：一个角色一张卡片，内含其全部外号） */
export interface CharacterCard {
  gameId: string
  character: string
  image: string // 角色图片（角色级）
  nicknames: Nickname[]
}

/** 外号列表查询条件 */
export interface NicknameQuery {
  gameId?: string
  keyword?: string // 关键词：匹配角色名 / 外号 / 由来
  tag?: string
  page: number
  pageSize: number
}
