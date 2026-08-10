import { defineStore } from 'pinia';
import { ref } from 'vue';
import { searchDiaryEntries } from '@/services/diaryService';
export const useDiarySearchStore = defineStore('diary-search', () => {
    const keyword = ref('');
    const results = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    let requestId = 0;
    const setKeyword = (value) => {
        keyword.value = value;
    };
    const clear = () => {
        requestId += 1;
        keyword.value = '';
        results.value = [];
        error.value = null;
        isLoading.value = false;
    };
    const search = async (rawKeyword) => {
        const normalized = rawKeyword.trim();
        setKeyword(normalized);
        if (!normalized) {
            clear();
            return;
        }
        const currentId = ++requestId;
        isLoading.value = true;
        error.value = null;
        results.value = [];
        try {
            const data = await searchDiaryEntries(normalized);
            if (currentId !== requestId) {
                return;
            }
            results.value = data;
        }
        catch (err) {
            if (currentId !== requestId) {
                return;
            }
            console.error('[DiarySearch] search failed', err);
            error.value = '检索失败，请稍后再试';
        }
        finally {
            if (currentId === requestId) {
                isLoading.value = false;
            }
        }
    };
    return {
        keyword,
        results,
        isLoading,
        error,
        search,
        clear,
        setKeyword
    };
});
