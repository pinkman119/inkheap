import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * 数字生命模块密钥加密工具：AES-256-GCM。
 * 加密密钥来自环境变量 APP_ENCRYPTION_KEY（64 位 hex = 32 字节）。
 * 未配置或格式错误时直接抛错（fail-fast，杜绝明文降级）。
 */
const ALGORITHM = 'aes-256-gcm';

export function ensureEncryptionKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      '[digital-life] APP_ENCRYPTION_KEY 未配置或格式错误：需要 64 位 hex 字符（32 字节）。请检查环境变量后重启。',
    );
  }
  return Buffer.from(hex, 'hex');
}

/** 加密：输出 "iv.tag.ciphertext"（均为 hex） */
export function encryptSecret(plain: string): string {
  const key = ensureEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join('.');
}

/** 解密：输入 "iv.tag.ciphertext" */
export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, encHex] = payload.split('.');
  if (!ivHex || !tagHex || !encHex) {
    throw new Error('密文格式错误');
  }
  const key = ensureEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/** 脱敏展示：sk-****last4 */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  const tail = plain.length > 4 ? plain.slice(-4) : '****';
  return `sk-****${tail}`;
}
