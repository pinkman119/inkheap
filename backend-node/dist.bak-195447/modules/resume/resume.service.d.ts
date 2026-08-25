import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto, UpdateResumeDto } from './dto/resume.dto';
export declare class ResumeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findActive(): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        content: Record<string, unknown>;
        updatedAt: Date;
    } | {
        id: null;
        name: string;
        isActive: boolean;
        content: {
            profile: {
                avatarText: string;
                name: string;
                handle: string;
                tagline: string;
                heroInfo: string;
            };
            info: ({
                icon: string;
                label: string;
                value: string;
                href: string;
            } | {
                icon: string;
                label: string;
                value: string;
                href: null;
            })[];
            education: {
                school: string;
                period: string;
                major: string;
            };
            certificates: {
                label: string;
                accent: boolean;
            }[];
            about: {
                leads: string[];
                callout: string;
            };
            techCategories: {
                title: string;
                items: {
                    name: string;
                    desc: string;
                }[];
            }[];
            projects: {
                title: string;
                year: string;
                desc: string;
                tags: {
                    label: string;
                    accent: boolean;
                }[];
            }[];
            experiences: {
                role: string;
                period: string;
                org: string;
                points: string[];
            }[];
        };
        updatedAt?: undefined;
    }>;
    list(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }[]>;
    findById(id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        content: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateResumeDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        content: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateResumeDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        content: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    activate(id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        content: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
