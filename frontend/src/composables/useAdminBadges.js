import { ref } from 'vue'
import { useApi } from './useApi'

/**
 * 后台侧栏红点状态（模块级单例，跨组件共享）：
 * - unreadCount：收信箱未读来信数
 * - pendingFriendCount：友链待审核申请数
 *
 * 侧栏 AdminShell 挂载时拉取，各业务页面在「标记已读 / 审核 / 删除」等操作后
 * 调用对应的 refresh 方法，即可让气泡实时更新，无需刷新页面。
 */
const unreadCount = ref(0)
const pendingFriendCount = ref(0)

export function useAdminBadges() {
  const api = useApi()

  /** 重新拉取收信箱未读数 */
  async function refreshUnread() {
    try {
      const stats = await api.get('/admin/contact/stats')
      unreadCount.value = stats?.unread ?? 0
    } catch {
      /* 忽略：未读数非关键 */
    }
  }

  /** 重新拉取友链待审核数 */
  async function refreshPendingFriends() {
    try {
      const stats = await api.get('/admin/friend-applications/stats')
      pendingFriendCount.value = stats?.pending ?? 0
    } catch {
      /* 忽略：待审核数非关键 */
    }
  }

  /** 同时刷新两个红点 */
  async function refreshAll() {
    await Promise.all([refreshUnread(), refreshPendingFriends()])
  }

  return { unreadCount, pendingFriendCount, refreshUnread, refreshPendingFriends, refreshAll }
}

export { unreadCount, pendingFriendCount }
