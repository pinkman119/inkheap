import { httpClient } from './http';

export type DiaryEntrySummary = {
  entryDate: string;
  mood: string | null;
  hasContent: boolean;
  hasPlans: boolean;
};

export type DiaryEntryDetail = {
  entryDate: string;
  mood: string | null;
  plans: string[];
  content: string;
};

export type DiarySearchResult = DiaryEntryDetail;

export type UpsertDiaryPayload = {
  entryDate: string;
  mood?: string | null;
  plans?: string[];
  content: string;
};

export const fetchDiarySummaries = async (year: number, month: number) => {
  const formatted = `${year}-${String(month).padStart(2, '0')}`;
  const { data } = await httpClient.get<DiaryEntrySummary[]>(`/diaries`, {
    params: { month: formatted }
  });
  return data;
};

export const fetchDiaryDetail = async (dateIso: string) => {
  const { data } = await httpClient.get<DiaryEntryDetail>(`/diaries/${dateIso}`);
  return data;
};

export const upsertDiaryEntry = async (payload: UpsertDiaryPayload) => {
  const { data } = await httpClient.post<DiaryEntryDetail>('/diaries', payload);
  return data;
};

export const deleteDiaryEntry = async (dateIso: string) => {
  await httpClient.delete(`/diaries/${dateIso}`);
};

export const searchDiaryEntries = async (keyword: string) => {
  const { data } = await httpClient.get<DiarySearchResult[]>('/diaries/search', {
    params: { keyword }
  });
  return data;
};
