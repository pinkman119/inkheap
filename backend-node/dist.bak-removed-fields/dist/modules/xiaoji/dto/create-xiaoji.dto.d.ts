export declare class PhotoDto {
    url: string;
    caption?: string;
}
export declare class CreateXiaojiDto {
    title: string;
    slug?: string;
    type?: string;
    tags?: string[];
    content: string;
    summary?: string;
    quote?: string;
    location?: string;
    date?: string;
    photos?: PhotoDto[];
    published?: boolean;
}
