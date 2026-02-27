import { create } from 'zustand';

const useOutbreakStore = create((set, get) => ({
    outbreaks: [],
    selectedOutbreak: null,
    viewMode: 'global', // 'global' | 'local'
    realtimeUpdates: true,
    summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    },

    // Actions
    setInitialOutbreaks: (data) => {
        set({ outbreaks: data });
        get().calculateSummary(data);
    },

    addOutbreak: (newOutbreak) => {
        set((state) => {
            // Prevent duplicates if socket emits same event
            if (state.outbreaks.find(o => o.id === newOutbreak.id)) return state;

            const updatedOutbreaks = [...state.outbreaks, newOutbreak];
            // Keep only last 50 to maintain performance
            if (updatedOutbreaks.length > 50) updatedOutbreaks.shift();

            get().calculateSummary(updatedOutbreaks);
            return { outbreaks: updatedOutbreaks };
        });
    },

    selectOutbreak: (outbreak) => {
        set({ selectedOutbreak: outbreak });
    },

    setViewMode: (mode) => {
        set({ viewMode: mode });
    },

    toggleRealtimeUpdates: () => {
        set((state) => ({ realtimeUpdates: !state.realtimeUpdates }));
    },

    calculateSummary: (data) => {
        const summary = {
            total: data.length,
            critical: data.filter(o => o.severity >= 80).length,
            high: data.filter(o => o.severity >= 60 && o.severity < 80).length,
            medium: data.filter(o => o.severity >= 40 && o.severity < 60).length,
            low: data.filter(o => o.severity < 40).length,
        };
        set({ summary });
    }
}));

export default useOutbreakStore;
