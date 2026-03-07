import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchOutbreaks as fetchOutbreaksApi } from '../lib/api';

// Map Supabase severity enum → numeric value used by the globe heatmap
const SEVERITY_MAP = { mild: 22, moderate: 55, severe: 90 };

function normalise(row) {
    return {
        id: row.id,
        lat: row.latitude,
        lng: row.longitude,
        severity: SEVERITY_MAP[row.severity] ?? 50,
        severityLabel: row.severity,       // 'mild' | 'moderate' | 'severe'
        disease: row.disease_type,
        affected: row.affected_people,
        children: row.children,
        adults: row.adults,
        elderly: row.elderly,
        areaName: row.area_name,
        reportedBy: row.reported_by,
        notes: row.notes,
        date: row.outbreak_date,
        createdAt: row.created_at,
    };
}

const useOutbreakStore = create((set, get) => ({
    outbreaks: [],
    selectedOutbreak: null,
    viewMode: 'global',        // 'global' | 'local'
    realtimeUpdates: true,
    loading: false,
    error: null,
    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },

    // ─── Initial data fetch ─────────────────────────────────────────────────
    fetchOutbreaks: async () => {
        set({ loading: true, error: null });
        try {
            const data = await fetchOutbreaksApi();
            const normalised = (data || []).map(normalise);
            set({ outbreaks: normalised, loading: false });
            get().calculateSummary(normalised);
        } catch (err) {
            console.error('Failed to fetch outbreaks:', err);
            set({ loading: false, error: err.message });
        }
    },

    // ─── Supabase Realtime subscription ────────────────────────────────────
    subscribeRealtime: () => {
        const channel = supabase
            .channel('outbreaks-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'outbreaks' },
                (payload) => {
                    const newOutbreak = normalise(payload.new);
                    set((state) => {
                        if (state.outbreaks.find(o => o.id === newOutbreak.id)) return state;
                        const updated = [newOutbreak, ...state.outbreaks].slice(0, 200);
                        get().calculateSummary(updated);
                        return { outbreaks: updated };
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'outbreaks' },
                (payload) => {
                    const updated = normalise(payload.new);
                    set((state) => {
                        const list = state.outbreaks.map(o => o.id === updated.id ? updated : o);
                        get().calculateSummary(list);
                        return { outbreaks: list };
                    });
                }
            )
            .subscribe();

        // Return unsubscribe function for cleanup
        return () => supabase.removeChannel(channel);
    },

    // ─── Actions ────────────────────────────────────────────────────────────
    setInitialOutbreaks: (data) => {
        set({ outbreaks: data });
        get().calculateSummary(data);
    },

    addOutbreak: (newOutbreak) => {
        set((state) => {
            if (state.outbreaks.find(o => o.id === newOutbreak.id)) return state;
            const updated = [newOutbreak, ...state.outbreaks].slice(0, 200);
            get().calculateSummary(updated);
            return { outbreaks: updated };
        });
    },

    selectOutbreak: (outbreak) => set({ selectedOutbreak: outbreak }),

    setViewMode: (mode) => set({ viewMode: mode }),

    toggleRealtimeUpdates: () =>
        set((state) => ({ realtimeUpdates: !state.realtimeUpdates })),

    calculateSummary: (data) => {
        const summary = {
            total: data.length,
            critical: data.filter(o => o.severity >= 80).length,
            high: data.filter(o => o.severity >= 60 && o.severity < 80).length,
            medium: data.filter(o => o.severity >= 40 && o.severity < 60).length,
            low: data.filter(o => o.severity < 40).length,
        };
        set({ summary });
    },
}));

export default useOutbreakStore;
