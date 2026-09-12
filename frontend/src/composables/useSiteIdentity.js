import { ref } from 'vue'
import { useApi } from './useApi'

/* =========================================================
   站点身份：「我」的头像与名称。
   首页名片 / 数字生命对话头像 / 知识库作者卡片共用同一份数据，
   保证任意页面展示的头像与作者名都跟随「首页管理」后台配置，且只请求一次。
   ========================================================= */

/** 默认头像占位图：后台未配置头像时使用 */
export const DEFAULT_AVATAR = 'https://picsum.photos/seed/cat/400/400'

/** 默认作者名：接口未返回时的兜底 */
export const DEFAULT_SITE_NAME = '慕士塔格猫'

/** 站点身份单例：跨页面共享，保证各页面展示一致 */
const siteAvatar = ref(DEFAULT_AVATAR)
const siteName = ref(DEFAULT_SITE_NAME)

/** 请求缓存：多个页面同时挂载时复用同一个请求，避免重复拉取 */
let identityPromise = null

export function useSiteIdentity() {
  const api = useApi()

  /** 用「首页管理」接口（/public/home-page）的数据设置名称与头像 */
  function applyHomePage(data) {
    if (data?.siteName) siteName.value = data.siteName
    siteAvatar.value = api.assetUrl(data?.avatar) || DEFAULT_AVATAR
  }

  /** 拉取站点身份；失败时保留默认值，保证页面可用 */
  function loadSiteIdentity() {
    if (identityPromise) return identityPromise
    identityPromise = api
      .get('/public/home-page')
      .then((data) => {
        applyHomePage(data)
        return data
      })
      .catch(() => {
        // 静默失败：使用默认头像与默认作者名
      })
    return identityPromise
  }

  /**
   * 头像图片加载失败时逐级降级：
   * 配置的头像 → 默认占位图 → 空字符串（由页面渲染兜底图标）
   */
  function onAvatarError() {
    if (siteAvatar.value === DEFAULT_AVATAR) siteAvatar.value = ''
    else siteAvatar.value = DEFAULT_AVATAR
  }

  return {
    siteAvatar,
    siteName,
    DEFAULT_AVATAR,
    DEFAULT_SITE_NAME,
    applyHomePage,
    loadSiteIdentity,
    onAvatarError,
  }
}
