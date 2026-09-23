// 种子数据：首次启动时写入 localStorage，之后增删改都基于本地数据
import type { Character, Contribution, Game, Nickname, PermissionNode, RoleItem, UserItem } from '@/types'

/** 收录的游戏 */
export const SEED_GAMES: Game[] = [
  { id: 'genshin', name: '原神', color: '#409eff' },
  { id: 'wzry', name: '王者荣耀', color: '#e6a23c' },
  { id: 'lol', name: '英雄联盟', color: '#909399' },
  { id: 'star', name: '崩坏：星穹铁道', color: '#f56c6c' }
]

/** 权限树（角色权限页的树形数据） */
export const PERMISSION_TREE: PermissionNode[] = [
  { key: 'dashboard:view', label: '首页仪表盘' },
  {
    key: 'nicknames:view',
    label: '外号库',
    children: [
      { key: 'nicknames:add', label: '新增外号' },
      { key: 'nicknames:edit', label: '编辑外号' },
      { key: 'nicknames:delete', label: '删除外号' },
      { key: 'nicknames:export', label: '导出CSV' }
    ]
  },
  { key: 'character:view', label: '角色详情' },
  { key: 'contribute:submit', label: '我要投稿' },
  {
    key: 'review:view',
    label: '投稿审核',
    children: [
      { key: 'review:audit', label: '审核操作' },
      { key: 'review:delete', label: '删除投稿' }
    ]
  },
  {
    key: 'roles:view',
    label: '角色权限管理',
    children: [{ key: 'roles:edit', label: '编辑权限' }]
  },
  { key: 'profile:view', label: '个人中心' }
]

/** 所有权限点（扁平化） */
export const ALL_PERMISSIONS: string[] = PERMISSION_TREE.flatMap((p) => [
  p.key,
  ...(p.children?.map((c) => c.key) ?? [])
])

/** 初始角色 */
export const SEED_ROLES: RoleItem[] = [
  {
    id: 'admin',
    name: '管理员',
    desc: '拥有系统全部权限',
    permissions: ALL_PERMISSIONS
  },
  {
    id: 'editor',
    name: '内容编辑',
    desc: '管理外号库、审核投稿，无权限管理功能',
    permissions: [
      'dashboard:view',
      'nicknames:view', 'nicknames:add', 'nicknames:edit', 'nicknames:delete', 'nicknames:export',
      'character:view', 'contribute:submit',
      'review:view', 'review:audit', 'review:delete',
      'profile:view'
    ]
  },
  {
    id: 'user',
    name: '普通玩家',
    desc: '浏览外号、查看详情、投稿新外号',
    permissions: [
      'dashboard:view', 'nicknames:view', 'character:view',
      'contribute:submit', 'profile:view'
    ]
  }
]

/** 初始账号（演示三个角色，密码统一 123456） */
export const SEED_USERS: UserItem[] = [
  { username: 'admin', password: '123456', nickname: '站长大大', roles: ['admin'] },
  { username: 'editor', password: '123456', nickname: '小编阿伟', roles: ['editor'] },
  { username: 'user', password: '123456', nickname: '快乐风男', roles: ['user'] }
]

// ---------- 外号种子数据 ----------
let nid = 0
const n = (
  gameId: string, character: string, nickname: string, origin: string,
  tags: string[], heat: number, contributor: string, createdAt: string
): Nickname => ({ id: ++nid, gameId, character, nickname, origin, tags, heat, contributor, createdAt })

export const SEED_NICKNAMES: Nickname[] = [
  // 原神
  n('genshin', '钟离', '帝君', '剧情中他是岩王帝君摩拉克斯的人间体，玩家习惯尊称"帝君"', ['剧情梗', '官方称号'], 998, '璃月吃瓜群众', '2026-08-02'),
  n('genshin', '迪卢克', '卢姥爷', '"卢"取自名字谐音，加上其贵族老爷气质，早期强度登顶被封"姥爷"', ['谐音梗', '强度梗'], 920, '晨曦酒庄常客', '2026-08-03'),
  n('genshin', '雷电将军', '雷神', '稻妻的雷电之神，玩家直接以神职简称', ['剧情梗'], 950, '稻妻幕府小兵', '2026-08-05'),
  n('genshin', '温迪', '风神', '蒙德风神巴巴托斯的人间体，平时扮成吟游诗人', ['剧情梗'], 880, '天使的馈赠酒保', '2026-08-06'),
  n('genshin', '达达利亚', '公子', '愚人众执行官第十一席"公子"，官方代号直接成了外号', ['官方称号'], 760, '至冬国情报员', '2026-08-08'),
  n('genshin', '甘雨', '椰羊', '麒麟角像羊角，早期角色演示被调侃像椰奶广告，得名椰羊', ['形象梗', '谐音梗'], 890, '月海亭秘书', '2026-08-09'),
  n('genshin', '胡桃', '堂主', '往生堂第七十七代堂主，身份即外号', ['剧情梗'], 720, '往生堂学徒', '2026-08-11'),
  n('genshin', '可莉', '火花骑士', '官方称号，因为到处放火炸鱼而火出圈', ['官方称号'], 830, '西风骑士团图书管理员', '2026-08-12'),
  n('genshin', '魈', '降魔大圣', '守护璃月的护法夜叉，官方称号"降魔大圣"', ['官方称号'], 700, '望舒客栈老板', '2026-08-14'),
  n('genshin', '枫原万叶', '叶天帝', '上线后辅助强度封神，玩家戏称其为"天帝"', ['强度梗'], 940, '浪人堇瓜摊主', '2026-08-15'),
  n('genshin', '芙宁娜', '水神', '枫丹的"水神"，剧情反差让这个称呼深入人心', ['剧情梗'], 960, '欧庇克莱歌剧院观众', '2026-08-18'),
  n('genshin', '神里绫华', '白鹭公主', '稻妻名门神里家的大小姐，官方雅称', ['官方称号'], 690, '稻妻茶屋店长', '2026-08-20'),
  // 王者荣耀
  n('wzry', '鲁班七号', '小短腿', '腿短走路一摇一摆，峡谷被追杀率第一名', ['形象梗'], 990, '峡谷小菜鸡', '2026-08-04'),
  n('wzry', '铠', '铠爹', '开启大招单挑近乎无敌，玩家尊称一声"爹"', ['强度梗'], 930, '长城守备军饭堂', '2026-08-07'),
  n('wzry', '庄周', '鱼', '坐骑是鲲，整局骑着鱼遨游峡谷', ['形象梗'], 850, '梦蝶居士', '2026-08-10'),
  n('wzry', '黄忠', '炮台', '开大后架起大炮坐地输出，人称移动炮台', ['技能梗'], 780, '蜀汉老兵', '2026-08-13'),
  n('wzry', '程咬金', '三板斧', '出自隋唐演义典故，开大回血赖线极难击杀', ['技能梗', '剧情梗'], 640, '大唐说书人', '2026-08-16'),
  n('wzry', '妲己', '小狐狸', '狐妖人设，技能简单，新手入门第一法师', ['形象梗'], 870, '新手训练营教官', '2026-08-17'),
  n('wzry', '后羿', '站撸王', '不走位纯平A的代表射手，站桩输出', ['玩法梗'], 800, '下路工具人', '2026-08-19'),
  n('wzry', '蔡文姬', '奶妈', '技能全是给队友回血，像队伍里的"奶妈"', ['玩法梗'], 750, '辅助位退休选手', '2026-08-21'),
  n('wzry', '干将莫邪', '丢老婆', '技能是把剑（妻子莫邪所化）扔出去攻击', ['技能梗', '剧情梗'], 820, '峡谷段子手', '2026-08-22'),
  n('wzry', '亚瑟', '大宝剑', '新手引导英雄，大招是从天而降的大宝剑', ['技能梗'], 710, '新手村村长', '2026-08-23'),
  // 英雄联盟
  n('lol', '亚索', '快乐风男', 'E来E去秀翻全场，死多少次都依然快乐', ['玩法梗'], 1000, '0-10的亚索', '2026-08-01'),
  n('lol', '亚索', '托儿索', '菜鸟亚索的戏称，操作像幼儿园水平', ['强度梗'], 860, '中路受害者', '2026-08-01'),
  n('lol', '李青', '盲僧', '盲人武僧的设定，打野常客', ['官方称号'], 890, '野区瞎子', '2026-08-09'),
  n('lol', '提莫', '提百万', '提莫队长每天都在被击杀，阵亡次数以百万计', ['玩法梗'], 910, '班德尔城蘑菇铺', '2026-08-11'),
  n('lol', '伊泽瑞尔', 'EZ', '英文名 Ezreal 的缩写，念起来最省事', ['缩写梗'], 940, '皮尔特沃夫探险家', '2026-08-13'),
  n('lol', '薇恩', 'VN', '英文名 Vayne 缩写，后期坦克杀手', ['缩写梗'], 880, '暗夜猎手粉丝团', '2026-08-15'),
  n('lol', '拉莫斯', '龙龟', '官方称号"披甲龙龟"，滚起来像个球', ['官方称号', '形象梗'], 700, '约德尔人来信', '2026-08-17'),
  n('lol', '雷恩加尔', '狮子狗', '外形是狮子，草丛跳来跳去像只大狗', ['形象梗'], 730, '草丛蹲守者', '2026-08-19'),
  n('lol', '卡兹克', '螳螂', '虚空掠夺者，外形就是一只大螳螂', ['形象梗'], 760, '进化论爱好者', '2026-08-21'),
  n('lol', '德莱厄斯', '诺手', '官方称号"诺克萨斯之手"的简称', ['缩写梗'], 850, '诺克萨斯征兵处', '2026-08-23'),
  // 崩坏：星穹铁道
  n('star', '三月七', '三月', '名字太长，队友都只喊前两个字', ['缩写梗'], 840, '星穹列车乘务组', '2026-08-06'),
  n('star', '布洛妮娅', '大鸭鸭', '头饰造型神似鸭嘴，加上系列作老梗', ['形象梗', '剧情梗'], 870, '贝洛伯格 excavator', '2026-08-08'),
  n('star', '卡芙卡', '卡妈', '气场温柔又强势，剧情里像哄孩子一样带开拓者', ['剧情梗'], 900, '星核猎手后援会', '2026-08-12'),
  n('star', '白露', '小龙人', '龙角萝莉的形象，一眼就是小龙人', ['形象梗'], 780, '仙舟药王秘传弟子', '2026-08-14'),
  n('star', '瓦尔特', '老杨', '上一代作品的领袖级人物，玩家习惯叫杨叔', ['剧情梗', '系列梗'], 810, '星穹列车老乘客', '2026-08-16'),
  n('star', '希儿', '小蝴蝶', '必杀技化身蝴蝶穿场，残影如蝶舞', ['技能梗', '形象梗'], 790, '下城区居民', '2026-08-18'),
  n('star', '杰帕德', '大盾哥', '全队护盾担当，人形城墙', ['玩法梗'], 650, '银鬃铁卫新兵', '2026-08-20')
]

// ---------- 投稿种子数据（待审核） ----------
let cid = 9000
const c = (
  gameId: string, character: string, nickname: string, origin: string,
  tags: string[], heat: number, contributor: string, createdAt: string,
  status: Contribution['status']
): Contribution => ({ id: ++cid, gameId, character, nickname, origin, tags, heat, contributor, createdAt, status })

export const SEED_CONTRIBUTIONS: Contribution[] = [
  c('genshin', '纳西妲', '草神', '须弥的草之神，玩家直接以神职简称', ['剧情梗'], 120, '须弥学者', '2026-09-15', 'pending'),
  c('wzry', '百里守约', '狙击手', '二技能狙击枪式瞄准射击，像狙击手一样蹲点', ['玩法梗'], 88, '峡谷对枪王', '2026-09-16', 'pending'),
  c('lol', '蒙多医生', '蒙多', '名字太顺口直接叫蒙多，"蒙多想去哪就去哪"', ['缩写梗'], 66, '祖安门诊部', '2026-09-16', 'pending'),
  c('star', '符玄', '卜卦大师', '技能围绕占卜穷观阵，像算命先生', ['玩法梗'], 45, '太卜司实习生', '2026-09-17', 'pending'),
  c('genshin', '香菱', '锅巴她妈', '身边跟着小火锅巴，人称锅巴她妈', ['剧情梗'], 52, '万民堂跑堂', '2026-09-18', 'approved'),
  c('wzry', '甄姬', '水妹妹', '技能全是水，控人像泡澡', ['技能梗'], 30, '中路法师爱好者', '2026-09-18', 'rejected')
]

// ---------- 演示角色头像（dataURL，投稿可带候选头像，审核通过后设为角色头像） ----------
function demoShot(text: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200">` +
    `<rect width="100%" height="100%" fill="#2b3a55"/>` +
    `<text x="50%" y="50%" fill="#ffd04b" font-size="18" text-anchor="middle" dominant-baseline="middle">${text} · 演示头像</text>` +
    `</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

SEED_CONTRIBUTIONS.find((i) => i.nickname === '草神')!.image = demoShot('纳西妲 · 智慧之神')

// ---------- 角色种子数据：由外号种子按 游戏+角色 聚合生成（新增流程：先建角色，外号挂角色下） ----------
export const SEED_CHARACTERS: Character[] = (() => {
  const list: Character[] = []
  const seen = new Set<string>()
  SEED_NICKNAMES.forEach((i) => {
    const key = `${i.gameId}|${i.character}`
    if (!seen.has(key)) {
      seen.add(key)
      // id 从 1000 起，避免与外号/投稿的 id 空间冲突
      list.push({ id: 1000 + list.length, gameId: i.gameId, character: i.character, image: '' })
    }
  })
  return list
})()
