package cn.inkheap.module.about.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.about.entity.AboutProfile;
import cn.inkheap.module.about.entity.AboutTravel;
import cn.inkheap.module.about.model.vo.AboutEventVO;
import cn.inkheap.module.about.model.vo.AboutFootprintVO;
import cn.inkheap.module.about.service.AboutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 关于我公开接口（无需鉴权）。
 */
@Tag(name = "关于我（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/about")
public class AboutPublicController {

    @Resource
    private AboutService aboutService;

    @Operation(summary = "个人资料", description = "声明返回 BaseResponse<AboutProfile>，实际响应体为 AboutProfile")
    @GetMapping("profile")
    public BaseResponse<AboutProfile> getProfile() {
        return ResultUtils.ok(aboutService.getProfile());
    }

    @Operation(summary = "足迹列表", description = "声明返回 BaseResponse<List<AboutFootprintVO>>，实际响应体为裸数组")
    @GetMapping("footprints")
    public BaseResponse<List<AboutFootprintVO>> findFootprints() {
        return ResultUtils.ok(aboutService.findFootprints());
    }

    @Operation(summary = "旅行卡片列表", description = "声明返回 BaseResponse<List<AboutTravel>>，实际响应体为裸数组")
    @GetMapping("travels")
    public BaseResponse<List<AboutTravel>> findTravels() {
        return ResultUtils.ok(aboutService.findTravels());
    }

    @Operation(summary = "事件列表", description = "date 为 YYYY-MM-DD；声明返回 BaseResponse<List<AboutEventVO>>，实际响应体为裸数组")
    @GetMapping("events")
    public BaseResponse<List<AboutEventVO>> findEvents() {
        return ResultUtils.ok(aboutService.findEvents());
    }
}
