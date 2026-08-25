export declare const DEFAULT_RESUME_CONTENT: {
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
export declare const DEFAULT_RESUME_NAME = "\u9ED8\u8BA4\u7248\u672C";
