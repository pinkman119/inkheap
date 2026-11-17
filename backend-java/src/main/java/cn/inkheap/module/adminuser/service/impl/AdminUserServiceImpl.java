package cn.inkheap.module.adminuser.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.CryptoUtils;
import cn.inkheap.module.adminuser.model.dto.AdminUserQueryRequest;
import cn.inkheap.module.adminuser.model.dto.CreateAdminUserRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateAvatarRequest;
import cn.inkheap.module.adminuser.model.dto.UpdatePasswordRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateRemarkRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateStatusRequest;
import cn.inkheap.module.adminuser.service.AdminUserService;
import cn.inkheap.module.auth.entity.AdminUser;
import cn.inkheap.module.auth.mapper.AdminUserMapper;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;
import cn.inkheap.module.upload.service.UploadService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> ADMIN_USER_SORT_FIELDS =
            Set.of("createdAt", "lastLoginAt", "username");

    private final AdminUserMapper adminUserMapper;

    private final CryptoUtils cryptoUtils;

    private final UploadService uploadService;

    @Override
    public List<AdminProfileVO> findAll(AdminUserQueryRequest request) {
        // 1、查询条件统一由 getQueryWrapper 构建
        List<AdminUser> users = adminUserMapper.selectListByQuery(getQueryWrapper(request));

        // 2、转为不含密码的 VO
        List<AdminProfileVO> result = new ArrayList<>(users.size());
        for (AdminUser user : users) {
            result.add(getVo(user));
        }
        return result;
    }

    @Override
    public QueryWrapper getQueryWrapper(AdminUserQueryRequest request) {
        // 1、基础条件：id 精确、账号模糊、状态与角色精确
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(AdminUser::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .like(AdminUser::getUsername, request.getUsername(), StrUtil.isNotBlank(request.getUsername()))
                .eq(AdminUser::getStatus, request.getStatus(), StrUtil.isNotBlank(request.getStatus()))
                .eq(AdminUser::getRole, request.getRole(), StrUtil.isNotBlank(request.getRole()));

        // 2、排序：sortField 命中白名单时按其排序，否则按创建时间升序
        String sortColumn = request.resolveSortColumn(ADMIN_USER_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(AdminUser::getCreatedAt, true);
        }
        return wrapper;
    }

    @Override
    public AdminProfileVO create(CreateAdminUserRequest request) {
        // 1、用户名唯一校验
        String username = request.getUsername().trim();
        AdminUser existing = adminUserMapper.selectOneByQuery(
                QueryWrapper.create().eq(AdminUser::getUsername, username));
        if (existing != null) {
            throw BusinessException.conflict("用户名已存在");
        }

        // 2、BCrypt 加密后入库（Builder 一次性构造）
        AdminUser user = AdminUser.builder()
                .id(IdUtil.randomUUID())
                .username(username)
                .password(cryptoUtils.encodeBcrypt(request.getPassword()))
                .role("admin")
                .remark(StrUtil.emptyToNull(StrUtil.trim(request.getRemark())))
                .status("active")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        adminUserMapper.insert(user);

        return getVo(user);
    }

    @Override
    public Map<String, Object> updatePassword(String id, UpdatePasswordRequest request, String currentUserId) {
        // 1、确认管理员存在
        AdminUser user = ensureExists(id);

        // 2、改自己必须校验原密码
        if (id.equals(currentUserId)) {
            if (StrUtil.isBlank(request.getOldPassword())) {
                throw BusinessException.badRequest("修改自己的密码需提供原密码");
            }
            if (!cryptoUtils.matchesBcrypt(request.getOldPassword(), user.getPassword())) {
                throw BusinessException.badRequest("原密码不正确");
            }
        }

        // 3、写入新密码
        AdminUser update = AdminUser.builder()
                .id(id)
                .password(cryptoUtils.encodeBcrypt(request.getNewPassword()))
                .updatedAt(Instant.now())
                .build();
        adminUserMapper.update(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public AdminProfileVO updateRemark(String id, UpdateRemarkRequest request) {
        // 1、确认存在
        ensureExists(id);

        // 2、空字符串表示清空
        AdminUser update = AdminUser.builder()
                .id(id)
                .remark(StrUtil.emptyToNull(StrUtil.trim(request.getRemark())))
                .updatedAt(Instant.now())
                .build();
        adminUserMapper.update(update);

        return getVo(ensureExists(id));
    }

    @Override
    public AdminProfileVO updateAvatar(String id, UpdateAvatarRequest request) {
        // 1、确认存在并记下旧头像
        AdminUser user = ensureExists(id);
        String avatar = StrUtil.emptyToNull(StrUtil.trim(request.getAvatar()));

        // 2、更新头像
        AdminUser update = AdminUser.builder()
                .id(id)
                .avatar(avatar)
                .updatedAt(Instant.now())
                .build();
        adminUserMapper.update(update);

        // 3、旧头像为本地文件时清理（外链或无记录时静默跳过）
        String old = StrUtil.nullToEmpty(user.getAvatar()).trim();
        if (!old.isEmpty() && !old.equals(avatar) && old.startsWith("/files/")) {
            uploadService.removeByUrl(old);
        }

        return getVo(ensureExists(id));
    }

    @Override
    public AdminProfileVO updateStatus(String id, UpdateStatusRequest request, String currentUserId) {
        // 1、禁止对自己操作，保证系统至少保留一个有效管理员
        if (id.equals(currentUserId)) {
            throw BusinessException.badRequest("不能对自己执行失效/启用操作");
        }

        // 2、确认存在并更新状态
        ensureExists(id);
        AdminUser update = AdminUser.builder()
                .id(id)
                .status(request.getStatus())
                .updatedAt(Instant.now())
                .build();
        adminUserMapper.update(update);

        return getVo(ensureExists(id));
    }

    private AdminUser ensureExists(String id) {
        AdminUser user = adminUserMapper.selectOneById(id);
        if (user == null) {
            throw BusinessException.notFound("管理员不存在");
        }
        return user;
    }

    private AdminProfileVO getVo(AdminUser user) {
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
