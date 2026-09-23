/// <reference types="vite/client" />

// 声明 .vue 模块类型，让 TS 认识单文件组件
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
