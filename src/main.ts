// 应用入口：注册 Pinia / Router / Element Plus / 全局图标 / 自定义指令
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as Icons from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { permission } from './directives/permission'

import './router/permission' // 注册路由守卫（登录鉴权 + 动态路由）
import '@/apis' // 注册全部 Mock 接口
import '@/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 全局注册 Element Plus 图标组件，模板里可直接用 <component :is="'HomeFilled'" />
for (const [name, comp] of Object.entries(Icons)) {
  app.component(name, comp)
}

// 自定义按钮权限指令：v-permission="'nicknames:add'"
app.directive('permission', permission)

app.mount('#app')
