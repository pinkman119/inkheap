package cn.inkheap.module.friendlink.service;

import cn.inkheap.module.friendlink.entity.FriendApplication;
import cn.inkheap.module.friendlink.entity.FriendLink;
import cn.inkheap.module.friendlink.model.dto.ApproveFriendApplicationRequest;
import cn.inkheap.module.friendlink.model.dto.FriendApplicationCreateRequest;
import cn.inkheap.module.friendlink.model.dto.FriendLinkQueryRequest;
import cn.inkheap.module.friendlink.model.dto.FriendLinkRequest;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 友链与加入申请服务。
 */
public interface FriendLinkService {

    /**
     * 后台友链列表：关键词 + 状态 + 模式筛选，按 sortOrder + createdAt 升序。
     *
     * @param request 查询参数
     * @return 友链列表
     */
    List<FriendLink> findAll(FriendLinkQueryRequest request);

    /**
     * 构建友链查询条件：状态、模式、关键词、排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(FriendLinkQueryRequest request);

    /**
     * 后台按 id 查询，不存在抛 404「友链不存在」。
     *
     * @param id 主键
     * @return 友链
     */
    FriendLink findOne(String id);

    /**
     * 前台友链列表：mode=work 取 0/1，mode=life 取 0/2。
     *
     * @param mode work / life
     * @return 友链列表
     */
    List<FriendLink> findPublic(String mode);

    /**
     * 新增友链：sortOrder 未传时取当前最大值 + 1。
     *
     * @param request 请求
     * @return 新友链
     */
    FriendLink create(FriendLinkRequest request);

    /**
     * 更新友链（空字符串表示清空可选字段）。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的友链
     */
    FriendLink update(String id, FriendLinkRequest request);

    /**
     * 删除友链：来源申请退回待审核（事务）。
     *
     * @param id 主键
     * @return 结果消息
     */
    Map<String, Object> remove(String id);

    /**
     * 上移 / 下移：与相邻记录交换 sortOrder。
     *
     * @param id        主键
     * @param direction up / down
     * @return 更新后的友链
     */
    FriendLink move(String id, String direction);

    /**
     * 前台提交加入申请（一律 pending）。
     *
     * @param request 请求
     * @return 新申请
     */
    FriendApplication apply(FriendApplicationCreateRequest request);

    /**
     * 前台「邻居留言」：全部申请，仅公开字段。
     *
     * @return 申请列表
     */
    List<Map<String, Object>> findPublicApplications();

    /**
     * 后台申请列表。
     *
     * @param keyword 关键词
     * @param status  状态（all 不过滤）
     * @return 申请列表
     */
    List<FriendApplication> findApplications(String keyword, String status);

    /**
     * 后台申请详情，不存在抛 404「申请不存在」。
     *
     * @param id 主键
     * @return 申请
     */
    FriendApplication findApplication(String id);

    /**
     * 申请统计：总数 / 待审核 / 已通过。
     *
     * @return 统计结果
     */
    Map<String, Long> applicationStats();

    /**
     * 审核通过：写申请状态并 upsert 友链、回写 linkId（事务）。
     *
     * @param id      申请 id
     * @param request 请求
     * @return 更新后的申请
     */
    FriendApplication approve(String id, ApproveFriendApplicationRequest request);

    /**
     * 审核拒绝：保留记录并写明原因。
     *
     * @param id     申请 id
     * @param remark 备注
     * @return 更新后的申请
     */
    FriendApplication reject(String id, String remark);

    /**
     * 删除申请。
     *
     * @param id 申请 id
     * @return 结果消息
     */
    Map<String, Object> removeApplication(String id);
}
