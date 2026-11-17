package cn.inkheap.module.visit.service;

import cn.inkheap.common.response.PageVO;

import java.util.Map;

/**
 * 访问统计服务。
 */
public interface VisitService {

    /**
     * 上报一次访问：按自然日聚合计数 + 落一条访客明细。
     *
     * @param path    访问路径
     * @param rawIp   客户端 IP
     * @return {day,count}
     */
    Map<String, Object> report(String path, String rawIp);

    /**
     * 后台「最近访问」列表：按时间倒序分页（不含 totalPages）。
     *
     * @param page     页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageVO<Map<String, Object>> getLogs(int page, int pageSize);

    /**
     * 清理超过保留期的访问明细。
     */
    void purgeExpired();
}
