package cn.inkheap.module.view.service;

/**
 * 阅读量服务：同一 IP 对同一内容每天最多计一次；自增时不刷新 updated_at。
 */
public interface ViewService {

    /**
     * 记录一次阅读。
     *
     * @param targetType article / note
     * @param targetId   内容 id
     * @param rawIp      客户端 IP
     * @return true = 本次计入真实阅读量；false = 今天该 IP 已计过
     */
    boolean record(String targetType, String targetId, String rawIp);

    /**
     * 清理超过保留期的阅读明细。
     */
    void purgeExpired();
}
