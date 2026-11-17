package cn.inkheap.module.auth.service.impl;

import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.CryptoUtils;
import cn.inkheap.module.auth.entity.AdminUser;
import cn.inkheap.module.auth.mapper.AdminUserMapper;
import cn.inkheap.module.auth.model.dto.AdminLoginRequest;
import cn.inkheap.module.auth.model.vo.AdminLoginVO;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;
import cn.inkheap.module.auth.service.AuthService;
import cn.inkheap.common.auth.JwtUtils;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AdminUserMapper adminUserMapper;

    private final CryptoUtils cryptoUtils;

    private final JwtUtils jwtUtils;

    @Override
    public AdminLoginVO login(AdminLoginRequest request) {
        // 1、按用户名查询
        AdminUser user = adminUserMapper.selectOneByQuery(
                QueryWrapper.create().eq(AdminUser::getUsername, request.getUsername()));
        if (user == null) {
            throw BusinessException.unauthorized("用户名或密码错误");
        }

        // 2、已失效账号不允许登录
        if (!"active".equals(user.getStatus())) {
            throw BusinessException.unauthorized("账号已失效，请联系管理员");
        }

        // 3、BCrypt 校验密码
        if (!cryptoUtils.matchesBcrypt(request.getPassword(), user.getPassword())) {
            throw BusinessException.unauthorized("用户名或密码错误");
        }

        // 4、记录最后登录时间
        AdminUser update = AdminUser.builder()
                .id(user.getId())
                .lastLoginAt(Instant.now())
                .build();
        adminUserMapper.update(update);

        // 5、签发 7 天 JWT（payload 与 Node 一致：sub / role）
        String token = jwtUtils.sign(user.getId(), user.getRole(), jwtUtils.adminExpireDays());
        String role = user.getRole() == null ? "admin" : user.getRole();
        return new AdminLoginVO(token,
                new AdminLoginVO.User(user.getId(), user.getUsername(), role, user.getAvatar()));
    }

    @Override
    public AdminProfileVO getProfile(String userId) {
        AdminUser user = adminUserMapper.selectOneById(userId);
        if (user == null) {
            throw BusinessException.unauthorized("Unauthorized");
        }
        return AdminProfileVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .remark(user.getRemark())
                .status(user.getStatus())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
