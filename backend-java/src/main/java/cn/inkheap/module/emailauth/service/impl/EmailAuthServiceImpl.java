package cn.inkheap.module.emailauth.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.auth.JwtUtils;
import cn.inkheap.common.auth.UserJwtFilter;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.CryptoUtils;
import cn.inkheap.module.emailauth.entity.EmailUser;
import cn.inkheap.module.emailauth.mapper.EmailUserMapper;
import cn.inkheap.module.emailauth.model.dto.EmailAuthRequest;
import cn.inkheap.module.emailauth.model.vo.EmailUserVO;
import cn.inkheap.module.emailauth.service.EmailAuthService;
import cn.inkheap.module.mail.service.MailService;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailAuthServiceImpl implements EmailAuthService {

    /** 验证码有效期 5 分钟 / 同邮箱重发间隔 60s */
    private static final long CODE_TTL_MS = 5 * 60 * 1000L;

    private static final long RESEND_INTERVAL_MS = 60 * 1000L;

    /** 找回密码：同邮箱 60s 一次、同 IP 每小时 10 次 */
    private static final long FORGOT_EMAIL_INTERVAL_MS = 60 * 1000L;

    private static final int FORGOT_IP_HOURLY_LIMIT = 10;

    private static final long FORGOT_IP_WINDOW_MS = 60 * 60 * 1000L;

    private final EmailUserMapper emailUserMapper;

    private final CryptoUtils cryptoUtils;

    private final JwtUtils jwtUtils;

    private final MailService mailService;

    /** email -> 验证码条目（内存，单实例部署；重启丢失可接受） */
    private final Map<String, CodeEntry> codeStore = new ConcurrentHashMap<>();

    /** 找回密码限流 */
    private final Map<String, Long> forgotEmailAt = new ConcurrentHashMap<>();

    private final Map<String, List<Long>> forgotIpLog = new ConcurrentHashMap<>();

    private record CodeEntry(String code, long expiresAt, long sentAt) {
    }

    @Override
    public void sendRegisterCode(String email) {
        // 1、已注册邮箱直接提示登录
        String normalized = normalizeEmail(email);
        EmailUser existed = findByEmail(normalized);
        if (existed != null) {
            throw BusinessException.badRequest("该邮箱已注册，请直接登录");
        }

        // 2、同邮箱 60s 重发间隔
        long now = System.currentTimeMillis();
        CodeEntry entry = codeStore.get(normalized);
        if (entry != null && now - entry.sentAt() < RESEND_INTERVAL_MS) {
            long wait = (RESEND_INTERVAL_MS - (now - entry.sentAt()) + 999) / 1000;
            throw BusinessException.tooManyRequests("发送过于频繁，请 " + wait + " 秒后再试");
        }

        // 3、发送成功后才落内存（失败不占用重发间隔）
        String code = RandomUtil.randomNumbers(6);
        mailService.sendRegisterCode(normalized, code);
        codeStore.put(normalized, new CodeEntry(code, now + CODE_TTL_MS, now));
    }

    @Override
    public Map<String, Object> register(EmailAuthRequest request, HttpServletResponse response) {
        // 1、邮箱唯一校验
        String email = normalizeEmail(request.getEmail());
        if (findByEmail(email) != null) {
            throw BusinessException.badRequest("该邮箱已注册，请直接登录");
        }

        // 2、验证码校验
        if (!verifyCode(email, request.getCode())) {
            throw BusinessException.badRequest("验证码错误或已过期");
        }
        codeStore.remove(email);

        // 3、密码 AES-256-GCM 可逆加密后入库
        EmailUser user = EmailUser.builder()
                .id(IdUtil.randomUUID())
                .email(email)
                .password(cryptoUtils.encrypt(request.getPassword()))
                .nickname(StrUtil.trim(request.getNickname()))
                .homepageUrl(StrUtil.emptyToNull(StrUtil.trim(request.getHomepageUrl())))
                .avatarUrl(StrUtil.emptyToNull(StrUtil.trim(request.getAvatarUrl())))
                .status("active")
                .lastLoginAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        emailUserMapper.insert(user);

        log.info("新用户注册: {}", email);
        return issueToken(user, response);
    }

    @Override
    public Map<String, Object> login(EmailAuthRequest request, HttpServletResponse response) {
        // 1、查询账号（不区分「邮箱不存在」与「密码错误」，避免枚举）
        String email = normalizeEmail(request.getEmail());
        EmailUser user = findByEmail(email);
        if (user == null || !"active".equals(user.getStatus())) {
            throw BusinessException.unauthorized("邮箱或密码错误");
        }

        // 2、密文解密后比对明文密码
        boolean passwordOk;
        try {
            passwordOk = request.getPassword() != null
                    && cryptoUtils.decrypt(user.getPassword()).equals(request.getPassword());
        } catch (Exception e) {
            log.error("密码解密失败: {}", email);
            passwordOk = false;
        }
        if (!passwordOk) {
            throw BusinessException.unauthorized("邮箱或密码错误");
        }

        // 3、记录最后登录时间
        EmailUser update = EmailUser.builder()
                .id(user.getId())
                .lastLoginAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        emailUserMapper.update(update);

        return issueToken(user, response);
    }

    @Override
    public void forgotPassword(String email, String ip) {
        String normalized = normalizeEmail(email);
        long now = System.currentTimeMillis();

        // 1、限流：同邮箱 60s 一次
        Long lastAt = forgotEmailAt.get(normalized);
        if (lastAt != null && now - lastAt < FORGOT_EMAIL_INTERVAL_MS) {
            long wait = (FORGOT_EMAIL_INTERVAL_MS - (now - lastAt) + 999) / 1000;
            throw BusinessException.tooManyRequests("操作过于频繁，请 " + wait + " 秒后再试");
        }

        // 2、限流：同 IP 每小时最多 10 次
        String ipKey = StrUtil.isBlank(ip) ? "unknown" : ip;
        List<Long> log = forgotIpLog.computeIfAbsent(ipKey, key -> new ArrayList<>());
        synchronized (log) {
            log.removeIf(timestamp -> now - timestamp >= FORGOT_IP_WINDOW_MS);
            if (log.size() >= FORGOT_IP_HOURLY_LIMIT) {
                throw BusinessException.tooManyRequests("操作过于频繁，请稍后再试");
            }
            log.add(now);
        }

        // 3、账号存在性（产品明确要求给出注册引导）
        EmailUser user = findByEmail(normalized);
        if (user == null) {
            throw BusinessException.badRequest("当前邮箱未注册，请进行注册");
        }

        // 4、解密明文密码并发送邮件
        String password = cryptoUtils.decrypt(user.getPassword());
        mailService.sendPassword(normalized, user.getNickname(), password);

        // 5、发送成功后记录邮箱限流
        forgotEmailAt.put(normalized, now);
    }

    @Override
    public EmailUserVO getProfile(String userId) {
        EmailUser user = emailUserMapper.selectOneById(userId);
        if (user == null || !"active".equals(user.getStatus())) {
            throw BusinessException.unauthorized("Unauthorized");
        }
        return new EmailUserVO(user.getId(), user.getEmail(), user.getNickname(), user.getHomepageUrl(),
                user.getAvatarUrl(), user.getLastLoginAt(), user.getCreatedAt());
    }

    @Override
    public void logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(UserJwtFilter.USER_TOKEN_COOKIE, "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private Map<String, Object> issueToken(EmailUser user, HttpServletResponse response) {
        // 1、签发 14 天访客 JWT（payload: sub + role=user）
        String token = jwtUtils.sign(user.getId(), "user", jwtUtils.userExpireDays());

        // 2、写 httpOnly cookie
        ResponseCookie cookie = ResponseCookie.from(UserJwtFilter.USER_TOKEN_COOKIE, token)
                .httpOnly(true)
                .path("/")
                .maxAge(Duration.ofDays(jwtUtils.userExpireDays()))
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // 3、返回脱敏用户信息
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> userInfo = new LinkedHashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail());
        userInfo.put("nickname", user.getNickname());
        userInfo.put("homepageUrl", user.getHomepageUrl());
        userInfo.put("avatarUrl", user.getAvatarUrl());
        result.put("user", userInfo);
        return result;
    }

    private boolean verifyCode(String email, String code) {
        CodeEntry entry = codeStore.get(email);
        if (entry == null) {
            return false;
        }
        if (System.currentTimeMillis() > entry.expiresAt()) {
            codeStore.remove(email);
            return false;
        }
        return entry.code().equals(code);
    }

    private EmailUser findByEmail(String email) {
        return emailUserMapper.selectOneByQuery(QueryWrapper.create().eq(EmailUser::getEmail, email));
    }

    private String normalizeEmail(String email) {
        return StrUtil.nullToEmpty(email).trim().toLowerCase();
    }
}
