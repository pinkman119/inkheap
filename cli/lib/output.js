// 统一的输出与错误处理。

/**
 * 打印结果：默认美化 JSON；`--json` 时输出紧凑 JSON，便于管道处理。
 * @param {*} data
 * @param {boolean} [compact]
 */
export function print(data, compact = false) {
  if (data === undefined || data === null) {
    process.stdout.write('\n');
    return;
  }
  if (typeof data === 'string') {
    process.stdout.write(data + '\n');
    return;
  }
  process.stdout.write(JSON.stringify(data, null, compact ? 0 : 2) + '\n');
}

/** 打印错误信息到 stderr，并以非零码退出。 */
export function fail(message) {
  process.stderr.write('错误: ' + message + '\n');
  process.exit(1);
}
