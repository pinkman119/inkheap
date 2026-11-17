package cn.inkheap.common.util;

import cn.hutool.core.util.HexUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * 加解密工具：
 * - AES-256-GCM：密钥来自 APP_ENCRYPTION_KEY（64 位 hex = 32 字节），密文格式 "iv.tag.ciphertext"（均为 hex），
 *   必须与 Node 实现字节级兼容 —— 访客密码与新老数据都依赖它。
 * - BCrypt：管理员密码校验。
 */
@Component
@RequiredArgsConstructor
public class CryptoUtils {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    private final AppProperties appProperties;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * 加密：输出 "ivHex.tagHex.cipherHex"。
     */
    public String encrypt(String plain) {
        try {
            byte[] key = resolveKey();
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, ALGORITHM), new GCMParameterSpec(TAG_BITS, iv));
            // SunJCE 的 GCM 模式把 16 字节认证标签追加在密文尾部，需拆开按 "iv.tag.cipher" 存储
            byte[] encryptedWithTag = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            int cipherLength = encryptedWithTag.length - TAG_BITS / 8;
            byte[] encrypted = new byte[cipherLength];
            byte[] tag = new byte[TAG_BITS / 8];
            System.arraycopy(encryptedWithTag, 0, encrypted, 0, cipherLength);
            System.arraycopy(encryptedWithTag, cipherLength, tag, 0, tag.length);
            return HexUtil.encodeHexStr(iv) + "." + HexUtil.encodeHexStr(tag) + "." + HexUtil.encodeHexStr(encrypted);
        } catch (Exception e) {
            throw new IllegalStateException("加密失败：" + e.getMessage(), e);
        }
    }

    /**
     * 解密：输入 "ivHex.tagHex.cipherHex"。
     */
    public String decrypt(String payload) {
        try {
            String[] parts = payload == null ? new String[0] : payload.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("密文格式错误");
            }
            byte[] key = resolveKey();
            byte[] iv = HexUtil.decodeHex(parts[0]);
            byte[] tag = HexUtil.decodeHex(parts[1]);
            byte[] encrypted = HexUtil.decodeHex(parts[2]);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, ALGORITHM), new GCMParameterSpec(TAG_BITS, iv));
            byte[] plain = new byte[encrypted.length + tag.length];
            System.arraycopy(encrypted, 0, plain, 0, encrypted.length);
            System.arraycopy(tag, 0, plain, encrypted.length, tag.length);
            return new String(cipher.doFinal(plain), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("解密失败：" + e.getMessage(), e);
        }
    }

    /**
     * 脱敏展示：sk-****last4。
     */
    public String mask(String plain) {
        if (StrUtil.isEmpty(plain)) {
            return "";
        }
        String tail = plain.length() > 4 ? plain.substring(plain.length() - 4) : "****";
        return "sk-****" + tail;
    }

    public boolean matchesBcrypt(String raw, String encoded) {
        if (StrUtil.isBlank(raw) || StrUtil.isBlank(encoded)) {
            return false;
        }
        return BCRYPT.matches(raw, encoded);
    }

    public String encodeBcrypt(String raw) {
        return BCRYPT.encode(raw);
    }

    private byte[] resolveKey() {
        String hex = appProperties.getEncryptionKey();
        if (StrUtil.isBlank(hex) || hex.length() != 64 || !hex.matches("[0-9a-fA-F]+")) {
            throw new IllegalStateException("APP_ENCRYPTION_KEY 未配置或格式错误：需要 64 位 hex 字符（32 字节）");
        }
        return HexUtil.decodeHex(hex);
    }
}
