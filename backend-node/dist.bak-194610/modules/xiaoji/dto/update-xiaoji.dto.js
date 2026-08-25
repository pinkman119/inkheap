"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateXiaojiDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_xiaoji_dto_1 = require("./create-xiaoji.dto");
class UpdateXiaojiDto extends (0, mapped_types_1.PartialType)(create_xiaoji_dto_1.CreateXiaojiDto) {
}
exports.UpdateXiaojiDto = UpdateXiaojiDto;
//# sourceMappingURL=update-xiaoji.dto.js.map