package cn.inkheap.module.adminuser.service;

import cn.inkheap.module.adminuser.model.dto.AdminUserQueryRequest;
import cn.inkheap.module.adminuser.model.dto.CreateAdminUserRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateAvatarRequest;
import cn.inkheap.module.adminuser.model.dto.UpdatePasswordRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateRemarkRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateStatusRequest;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 管理员账号服务。
 */
public interface AdminUserService {

    /**
     * 管理员列表（不含 password），默认按创建时间升序。
     *
     * @param request 查询请求
     * @return 列表
     */
    List<AdminProfileVO> findAll(AdminUserQueryRequest request);

    /**
     * 新增管理员：用户名冲突返回 409。
     *
     * @param request 请求
     * @return 新管理员
     */
    AdminProfileVO create(CreateAdminUserRequest request);

    /**
     * 修改密码：改自己必须校验原密码。
     *
     * @param id            目标管理员 id
     * @param request       请求
     * @param currentUserId 当前登录管理员 id
     * @return {success:true}
     */
    Map<String, Object> updatePassword(String id, UpdatePasswordRequest request, String currentUserId);

    /**
     * 修改备注。
     *
     * @param id      目标管理员 id
     * @param request 请求
     * @return 更新后的管理员
     */
    AdminProfileVO updateRemark(String id, UpdateRemarkRequest request);

    /**
     * 修改头像（替换或移除时清理旧上传文件）。
     *
     * @param id      目标管理员 id
     * @param request 请求
     * @return 更新后的管理员
     */
    AdminProfileVO updateAvatar(String id, UpdateAvatarRequest request);

    /**
     * 失效 / 启用：禁止对自己操作。
     *
     * @param id            目标管理员 id
     * @param request       请求
     * @param currentUserId 当前登录管理员 id
     * @return 更新后的管理员
     */
    AdminProfileVO updateStatus(String id, UpdateStatusRequest request, String currentUserId);

    /**
     * 构建管理员查询条件：账号 / 状态 / 角色与排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(AdminUserQueryRequest request);
}
