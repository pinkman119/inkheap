// 轻量命令行参数解析器（零依赖）。
// 支持：
//   --flag            布尔标志（值为 true）
//   --key value       键值对（值为紧随其后的非 -- 开头的参数）
//   --key=value       键值对（等号形式，值可含空格/以 - 开头）
//   --                后续参数全部视为位置参数
//   -h / -j           短标志（映射见 SHORT_FLAGS）
// 位置参数之外的裸参数按出现顺序收集到 `positional`。

const SHORT_FLAGS = {
  '-h': 'help',
  '-j': 'json',
  '-v': 'version',
};

/**
 * @param {string[]} argv 通常是 process.argv.slice(2)
 * @returns {{ positional: string[], options: Record<string, string | boolean> }}
 */
export function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // `--` 之后全部是位置参数
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      let raw = arg.slice(2);
      let key = raw;
      let value = true;

      const eq = raw.indexOf('=');
      if (eq !== -1) {
        key = raw.slice(0, eq);
        value = raw.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        // 仅当下一个参数不是标志时，才把它当作本键的值
        if (next !== undefined && !next.startsWith('--') && next !== '-') {
          value = next;
          i++;
        }
      }

      options[key] = value;
    } else if (arg.startsWith('-') && arg.length > 1) {
      // 短标志：映射到长名，作为布尔标志
      const key = SHORT_FLAGS[arg] || arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

/**
 * 把选项值解析为布尔。
 * `--flag` -> true；`--flag=false` / `--no-flag` -> false；其余字符串按真值表。
 * @param {string | boolean} value
 * @param {string} key 用于报错提示
 * @returns {boolean}
 */
export function parseBool(value, key) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return false;
  const lower = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lower)) return true;
  if (['false', '0', 'no', 'off'].includes(lower)) return false;
  throw new Error(`选项 --${key} 需要布尔值（true/false），收到: ${value}`);
}

/**
 * 从选项对象中取出值，若为 undefined 返回 null。
 * @param {Record<string, string | boolean>} options
 * @param {string} key
 */
export function opt(options, key) {
  const v = options[key];
  return v === undefined ? null : v;
}
