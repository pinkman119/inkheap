/**
 * 将智谱 embedding 调用异常转为可读的中文提示
 * （401 鉴权失败最常见：Key 无效 / 过期 / 欠费停用）。
 */
export function describeEmbeddingError(e: any): string {
  const status = e?.status ?? e?.response?.status;
  const raw =
    e?.response?.data?.error?.message ||
    e?.error?.message ||
    e?.message ||
    '未知错误';
  if (
    status === 401 ||
    /401|令牌|token|鉴权|unauthorized|api[ _-]?key/i.test(String(raw))
  ) {
    return '智谱 API Key 无效或已过期（401）：请在「数字生命 → 模型管理」更新智谱模型的 Key 后重试';
  }
  if (status === 429 || /429|rate|频率|限流/i.test(String(raw))) {
    return '智谱 embedding 调用被限流（429），请稍后重试';
  }
  return `调用智谱 embedding-3 失败：${raw}`;
}
