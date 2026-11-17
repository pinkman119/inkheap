package cn.inkheap.module.about.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.about.entity.AboutProfile;
import cn.inkheap.module.about.entity.AboutTravel;
import cn.inkheap.module.about.model.dto.EventRequest;
import cn.inkheap.module.about.model.dto.FootprintRequest;
import cn.inkheap.module.about.model.dto.ToggleEventRingRequest;
import cn.inkheap.module.about.model.dto.TravelRequest;
import cn.inkheap.module.about.model.dto.UpdateAboutProfileRequest;
import cn.inkheap.module.about.model.vo.AboutEventVO;
import cn.inkheap.module.about.model.vo.AboutFootprintVO;
import cn.inkheap.module.about.service.AboutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 关于我管理接口（后台）。
 */
@Tag(name = "关于我（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/about")
public class AboutAdminController {

    @Resource
    private AboutService aboutService;

    @Operation(summary = "个人资料", description = "声明返回 BaseResponse<AboutProfile>，实际响应体为 AboutProfile")
    @GetMapping("profile")
    public BaseResponse<AboutProfile> getProfile() {
        return ResultUtils.ok(aboutService.getProfile());
    }

    @Operation(summary = "更新个人资料", description = "声明返回 BaseResponse<AboutProfile>，实际响应体为 AboutProfile")
    @PutMapping("profile")
    @Log(module = LogModuleEnum.ABOUT, description = "更新关于我资料")
    public BaseResponse<AboutProfile> updateProfile(@RequestBody UpdateAboutProfileRequest request) {
        return ResultUtils.ok(aboutService.updateProfile(request));
    }

    @Operation(summary = "足迹列表", description = "声明返回 BaseResponse<List<AboutFootprintVO>>，实际响应体为裸数组")
    @GetMapping("footprints")
    public BaseResponse<List<AboutFootprintVO>> findFootprints() {
        return ResultUtils.ok(aboutService.findFootprints());
    }

    @Operation(summary = "新增足迹", description = "声明返回 BaseResponse<AboutFootprintVO>，实际响应体为 AboutFootprintVO")
    @PostMapping("footprints")
    @Log(module = LogModuleEnum.ABOUT, description = "新增足迹")
    public BaseResponse<AboutFootprintVO> createFootprint(@RequestBody FootprintRequest request) {
        return ResultUtils.ok(aboutService.createFootprint(request));
    }

    @Operation(summary = "更新足迹", description = "声明返回 BaseResponse<AboutFootprintVO>，实际响应体为 AboutFootprintVO")
    @PutMapping("footprints/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "更新足迹")
    public BaseResponse<AboutFootprintVO> updateFootprint(@PathVariable String id,
                                                         @RequestBody FootprintRequest request) {
        return ResultUtils.ok(aboutService.updateFootprint(id, request));
    }

    @Operation(summary = "删除足迹", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("footprints/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "删除足迹")
    public BaseResponse<Map<String, Object>> removeFootprint(@PathVariable String id) {
        return ResultUtils.ok(aboutService.removeFootprint(id));
    }

    @Operation(summary = "旅行卡片列表", description = "声明返回 BaseResponse<List<AboutTravel>>，实际响应体为裸数组")
    @GetMapping("travels")
    public BaseResponse<List<AboutTravel>> findTravels() {
        return ResultUtils.ok(aboutService.findTravels());
    }

    @Operation(summary = "新增旅行卡片", description = "声明返回 BaseResponse<AboutTravel>，实际响应体为 AboutTravel")
    @PostMapping("travels")
    @Log(module = LogModuleEnum.ABOUT, description = "新增旅行卡片")
    public BaseResponse<AboutTravel> createTravel(@RequestBody TravelRequest request) {
        return ResultUtils.ok(aboutService.createTravel(request));
    }

    @Operation(summary = "更新旅行卡片", description = "声明返回 BaseResponse<AboutTravel>，实际响应体为 AboutTravel")
    @PutMapping("travels/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "更新旅行卡片")
    public BaseResponse<AboutTravel> updateTravel(@PathVariable String id, @RequestBody TravelRequest request) {
        return ResultUtils.ok(aboutService.updateTravel(id, request));
    }

    @Operation(summary = "删除旅行卡片", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("travels/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "删除旅行卡片")
    public BaseResponse<Map<String, Object>> removeTravel(@PathVariable String id) {
        return ResultUtils.ok(aboutService.removeTravel(id));
    }

    @Operation(summary = "事件列表", description = "声明返回 BaseResponse<List<AboutEventVO>>，实际响应体为裸数组")
    @GetMapping("events")
    public BaseResponse<List<AboutEventVO>> findEvents() {
        return ResultUtils.ok(aboutService.findEvents());
    }

    @Operation(summary = "新增事件", description = "声明返回 BaseResponse<AboutEventVO>，实际响应体为 AboutEventVO")
    @PostMapping("events")
    @Log(module = LogModuleEnum.ABOUT, description = "新增事件")
    public BaseResponse<AboutEventVO> createEvent(@RequestBody EventRequest request) {
        return ResultUtils.ok(aboutService.createEvent(request));
    }

    @Operation(summary = "更新事件", description = "声明返回 BaseResponse<AboutEventVO>，实际响应体为 AboutEventVO")
    @PutMapping("events/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "更新事件")
    public BaseResponse<AboutEventVO> updateEvent(@PathVariable String id, @RequestBody EventRequest request) {
        return ResultUtils.ok(aboutService.updateEvent(id, request));
    }

    @Operation(summary = "设为成就/取消成就", description = "声明返回 BaseResponse<AboutEventVO>，实际响应体为 AboutEventVO")
    @PatchMapping("events/{id}/ring")
    @Log(module = LogModuleEnum.ABOUT, description = "切换事件成就标记")
    public BaseResponse<AboutEventVO> toggleEventRing(@PathVariable String id,
                                                      @RequestBody ToggleEventRingRequest request) {
        return ResultUtils.ok(aboutService.toggleEventRing(id, request));
    }

    @Operation(summary = "删除事件", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("events/{id}")
    @Log(module = LogModuleEnum.ABOUT, description = "删除事件")
    public BaseResponse<Map<String, Object>> removeEvent(@PathVariable String id) {
        return ResultUtils.ok(aboutService.removeEvent(id));
    }
}
