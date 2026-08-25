export declare class ResumeContentDto {
    name: string;
}
export declare class CreateResumeDto {
    name?: string;
    content: ResumeContentDto;
    isActive?: boolean;
}
export declare class UpdateResumeDto {
    name?: string;
    content?: ResumeContentDto;
    readonly _requireNameOrContent?: never;
}
