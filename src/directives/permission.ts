// v-permission 按钮权限指令
// 用法：<el-button v-permission="'nicknames:delete'">删除</el-button>
// 原理：当前用户权限点列表里没有对应权限时，直接隐藏元素
import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

export const permission: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const store = useUserStore()
    if (!store.hasPermission(binding.value)) {
      el.style.display = 'none'
    }
  }
}
