// 登录鉴权接口
import { mock } from './request'
import { getUsers } from './mockdb'

/** POST /auth/login 登录 */
mock('POST', '/auth/login', ({ body }) => {
  const { username, password } = body
  const user = getUsers().find((u) => u.username === username && u.password === password)
  if (!user) throw new Error('用户名或密码错误')
  // token 规则：mock-token-用户名（真实项目由后端签发 JWT）
  return { token: 'mock-token-' + username, userInfo: user }
})
