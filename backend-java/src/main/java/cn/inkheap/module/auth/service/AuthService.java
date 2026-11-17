package cn.inkheap.module.auth.service;

import cn.inkheap.module.auth.model.dto.AdminLoginRequest;
import cn.inkheap.module.auth.model.vo.AdminLoginVO;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;

/**
 * 管理员登录服务。
 */
public interface AuthService {

    /**
     * 管理员登录：用户名 + BCrypt 密码校验，签发 7 天 JWT 并记录最后登录时间。
     *
     * @param request 登录请求
     * @return token 与用户信息
     */
    AdminLoginVO login(AdminLoginRequest request);

    /**
     * 当前管理员资料。
     *
     * @param userId 管理员 id
     * @return 资料
     */
    AdminProfileVO getProfile(String userId);
}
