import { HomePageService } from './homepage.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
export declare class HomePagePublicController {
    private readonly service;
    constructor(service: HomePageService);
    findOne(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        siteName: string;
        personTitle: string;
        codeContent: string;
        avatar: string | null;
    } | {
        id: string;
        siteName: string;
        personTitle: string;
        codeContent: string;
        createdAt: null;
        updatedAt: null;
    }>;
}
export declare class HomePageAdminController {
    private readonly service;
    constructor(service: HomePageService);
    findOne(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        siteName: string;
        personTitle: string;
        codeContent: string;
        avatar: string | null;
    } | {
        id: string;
        siteName: string;
        personTitle: string;
        codeContent: string;
        createdAt: null;
        updatedAt: null;
    }>;
    update(dto: UpdateHomePageDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        siteName: string;
        personTitle: string;
        codeContent: string;
        avatar: string | null;
    }>;
}
