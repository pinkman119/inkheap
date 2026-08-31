import { useApi } from './useApi'
import { loadAboutData } from '@/data/about'

/**
 * 页面数据预加载（一次性消费缓存）。
 *
 * 首页渲染完成后，后台并发拉取当前模式目标页面的首屏接口并暂存；
 * 用户首次从首页切入目标页时，页面命中缓存直接装配、跳过网络请求，消费后即删除。
 * 之后再次进入页面（或重新回到首页再切出）走正常请求，保证数据不会长期过期。
 *
 * 约定：
 * - 预加载失败静默降级：页面进入时走原有请求 + 默认数据兜底。
 * - 只缓存「默认首屏条件」的数据（知识库为 page=1 无筛选），页内切换分类/搜索/分页仍走正常请求。
 * - 预加载仅覆盖知识库 / 简历 / 小记 / 关于我，数字生命页不参与。
 */

const cache = new Map() // key -> 已解析的数据
const inflight = new Map() // key -> Promise（去重并发预加载）

/** 取走预加载缓存（一次性消费：取出即删除），未命中返回 null */
export function takePreloaded(key) {
  if (!cache.has(key)) return null
  const data = cache.get(key)
  cache.delete(key)
  return data
}

/** 预加载单个页面：已缓存或加载中则跳过，失败静默 */
function preload(key, loader) {
  if (cache.has(key) || inflight.has(key)) return
  const p = loader()
    .then((data) => {
      cache.set(key, data)
    })
    .catch(() => {
      // 预加载失败不打扰用户，页面进入时自行请求兜底
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, p)
}

/* ===== 各目标页面的「首屏接口」加载器 ===== */

async function loadArticlesData() {
  const api = useApi()
  const [tree, list, feed] = await Promise.all([
    api.get('/categories/tree'),
    api.get('/articles?page=1&pageSize=20'),
    api.get('/articles/feed?page=1&pageSize=20'),
  ])
  return { tree, list, feed }
}

async function loadResumeData() {
  const api = useApi()
  return api.get('/public/resume')
}

async function loadXiaojiData() {
  const api = useApi()
  const [list, cats, stat] = await Promise.all([
    api.get('/xiaoji'),
    api.get('/xiaoji/categories'),
    api.get('/xiaoji/stats'),
  ])
  return { list, cats, stat }
}

/** 按模式预加载对应页面：工作模式 -> 知识库 + 简历；生活模式 -> 小记 + 关于我 */
export function preloadForMode(modeValue) {
  if (modeValue === 'life') {
    preload('xiaoji', loadXiaojiData)
    preload('about', loadAboutData)
  } else {
    preload('articles', loadArticlesData)
    preload('resume', loadResumeData)
  }
}
