export interface HomePageEntity {
  id: string;
  siteName: string;
  personTitle: string;
  codeContent: string;
  avatar?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
