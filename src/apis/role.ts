// 角色权限接口 + 个人资料接口
import { mock } from './request'
import { getRoles, getUsers, setRoles, setUsers } from './mockdb'

/** GET /roles 角色列表 */
mock('GET', '/roles', () => getRoles())

/** PUT /roles/:id 更新角色权限（管理员角色禁止修改） */
mock('PUT', '/roles/:id', ({ params, body }) => {
  const list = getRoles()
  const role = list.find((r) => r.id === params.id)
  if (!role) throw new Error('角色不存在')
  if (role.id === 'admin') throw new Error('管理员拥有全部权限，不允许修改')
  const permissions: string[] = body.permissions ?? []
  if (permissions.length === 0) throw new Error('角色至少需要保留一个权限')
  role.permissions = permissions
  setRoles(list)
  return role
})

/** PUT /user/profile 修改当前用户资料（从 token 解析当前用户） */
mock('PUT', '/user/profile', ({ body, headers }) => {
  const username = String(headers.Authorization || '').replace('Bearer mock-token-', '')
  const users = getUsers()
  const user = users.find((u) => u.username === username)
  if (!user) throw new Error('登录状态异常，请重新登录')
  if (body.nickname) user.nickname = body.nickname
  if (body.avatar !== undefined) user.avatar = body.avatar
  if (body.password) user.password = body.password
  setUsers(users)
  // 不返回密码
  const { password: _pwd, ...safe } = user
  return safe
})
