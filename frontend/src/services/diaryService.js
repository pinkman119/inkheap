import { httpClient } from './http';

export const searchDiaryEntries = async (keyword) => {
    const { data } = await httpClient.get('/diaries/search', {
        params: { keyword }
    });
    return data;
};
export const fetchDiarySummaries = async (year, month) => {
    const formatted = `${year}-${String(month).padStart(2, '0')}`;
    const { data } = await httpClient.get(`/diaries`, {
        params: { month: formatted }
    });
    return data;
};
export const fetchDiaryDetail = async (dateIso) => {
    const { data } = await httpClient.get(`/diaries/${dateIso}`);
    return data;
};
export const upsertDiaryEntry = async (payload) => {
    const { data } = await httpClient.post('/diaries', payload);
    return data;
};
export const deleteDiaryEntry = async (dateIso) => {
    await httpClient.delete(`/diaries/${dateIso}`);
};
