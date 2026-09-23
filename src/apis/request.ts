// fetch 统一封装：请求/响应拦截器 + Mock 适配器
// 说明：本项目没有真实后端，通过 Mock 路由表在本地模拟接口；
// 但保留了完整的拦截器链路与统一响应结构，日后切换真实后端只需替换适配器部分。

export interface MockCtx {
  params: Record<string, string> // 路径参数
  query: Record<string, any> // 查询参数
  body: any // 请求体
  headers: Record<string, string> // 请求头
}

/** 统一响应结构 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

interface RequestConfig {
  method: string
  url: string
  query?: Record<string, any>
  body?: any
  headers: Record<string, string>
}

type MockHandler = (ctx: MockCtx) => any
interface MockRoute {
  method: string
  pattern: RegExp
  keys: string[]
  handler: MockHandler
}

const mockRoutes: MockRoute[] = []
const requestInterceptors: ((c: RequestConfig) => RequestConfig)[] = []
const responseInterceptors: ((r: ApiResponse) => ApiResponse)[] = []

/**
 * 注册 Mock 接口
 * @param method 请求方法
 * @param url 接口地址，支持路径参数，如 '/nicknames/:id'
 */
export function mock(method: string, url: string, handler: MockHandler) {
  const keys: string[] = []
  const pattern = new RegExp(
    '^' + url.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)' }) + '$'
  )
  mockRoutes.push({ method, pattern, keys, handler })
}

/** 模拟网络延时 */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))

/** 请求拦截器执行 + Mock 路由匹配 + 响应拦截器执行 */
async function request<T>(
  method: string,
  url: string,
  config: Partial<RequestConfig>
): Promise<T> {
  let cfg: RequestConfig = { method, url, headers: {}, ...config }

  // 1. 请求拦截器
  for (const fn of requestInterceptors) cfg = fn(cfg)

  // 2. 匹配 Mock 路由
  const route = mockRoutes.find((r) => r.method === method && r.pattern.test(cfg.url))
  if (!route) throw new Error(`接口不存在: ${method} ${url}`)
  await delay()

  // 解析路径参数
  const matched = cfg.url.match(route.pattern)!
  const params: Record<string, string> = {}
  route.keys.forEach((k, i) => (params[k] = decodeURIComponent(matched[i + 1])))

  // 3. 执行处理器，包装统一响应结构
  let res: ApiResponse
  try {
    const data = await route.handler({
      params,
      query: cfg.query ?? {},
      body: cfg.body,
      headers: cfg.headers
    })
    res = { code: 0, data, message: 'ok' }
  } catch (e) {
    res = { code: 1, data: null, message: (e as Error).message }
  }

  // 4. 响应拦截器
  for (const fn of responseInterceptors) res = fn(res)

  if (res.code !== 0) throw new Error(res.message)
  return res.data as T
}

/** 对外暴露的请求方法 */
export const http = {
  get: <T>(url: string, query?: Record<string, any>) => request<T>('GET', url, { query }),
  post: <T>(url: string, body?: any) => request<T>('POST', url, { body }),
  put: <T>(url: string, body?: any) => request<T>('PUT', url, { body }),
  delete: <T>(url: string) => request<T>('DELETE', url, {})
}

// 全局默认请求拦截器：自动携带 token，并做登录校验
requestInterceptors.push((cfg) => {
  const token = localStorage.getItem('nhub_token') || ''
  if (!cfg.url.startsWith('/auth') && !token) {
    throw new Error('未登录或登录已过期，请重新登录')
  }
  cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
})
