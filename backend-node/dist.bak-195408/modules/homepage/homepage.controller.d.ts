import { HomePageService } from './homepage.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
export declare class HomePagePublicController {
    private readonly service;
    constructor(service: HomePageService);
    findOne(): Promise<any>;
}
export declare class HomePageAdminController {
    private readonly service;
    constructor(service: HomePageService);
    findOne(): Promise<any>;
    update(dto: UpdateHomePageDto): Promise<any>;
}
