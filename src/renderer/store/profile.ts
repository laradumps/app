import { defineStore } from 'pinia';
import { useSettingsStore } from '@/store/settings';

export interface ProfileEntry {
    id: string;
    type: 'app' | 'event' | 'sql' | 'eloquent' | 'view' | 'controller' | 'http' | 'cache' | 'job' | 'method';
    name: string;
    start_ms: number;
    duration_ms: number | null;
    parent_id: string | null;
    metadata: Record<string, any>;
    origin: {
        class: string | null;
        method: string | null;
        file: string | null;
        line: number | null;
    };
}

export interface ProfileSummary {
    total_entries: number;
    by_type: Record<string, { count: number; total_duration_ms: number }>;
}

export interface Profile {
    id: string;
    profile_id: string;
    label: string;
    start_time: number;
    end_time: number | null;
    total_duration_ms: number;
    entries: ProfileEntry[];
    summary: ProfileSummary;
    date_time: string;
    ide_handle?: any;
}

export const useProfileStore = defineStore('profile', {
    state: () => ({
        profiles: {} as Record<string, Profile>,
        selectedProfileId: null as string | null
    }),

    getters: {
        profileList: (state): Profile[] => {
            return Object.values(state.profiles).sort(
                (a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
            );
        },

        selectedProfile: (state): Profile | null => {
            if (!state.selectedProfileId) return null;
            return state.profiles[state.selectedProfileId] || null;
        },

        latestProfile: (state): Profile | null => {
            const profiles = Object.values(state.profiles);
            if (profiles.length === 0) return null;
            return profiles.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())[0];
        }
    },

    actions: {
        addProfile(payload: any) {
            const profileData = payload.profiler || payload.profile || payload.content || payload;

            const profile: Profile = {
                id: payload.id,
                profile_id: profileData.profile_id,
                label: profileData.label,
                start_time: profileData.start_time,
                end_time: profileData.end_time,
                total_duration_ms: profileData.total_duration_ms,
                entries: profileData.entries || [],
                summary: profileData.summary || { total_entries: 0, by_type: {} },
                date_time: payload.date_time || new Date().toISOString(),
                ide_handle: payload.ide_handle
            };

            this.profiles[profile.id] = profile;

            this.selectedProfileId = profile.id;

            this._enforceLimit();
        },

        _enforceLimit() {
            const limit = useSettingsStore().settings.limit_dumps || 500;
            const ids = Object.keys(this.profiles);

            if (ids.length <= limit) {
                return;
            }

            ids.sort(
                (a, b) =>
                    new Date(this.profiles[a].date_time).getTime() - new Date(this.profiles[b].date_time).getTime()
            );

            for (let i = 0; i < ids.length - limit; i++) {
                if (ids[i] !== this.selectedProfileId) {
                    delete this.profiles[ids[i]];
                }
            }
        },

        selectProfile(id: string) {
            this.selectedProfileId = id;
        },

        removeProfile(id: string) {
            delete this.profiles[id];
            if (this.selectedProfileId === id) {
                const remaining = Object.keys(this.profiles);
                this.selectedProfileId = remaining.length > 0 ? remaining[0] : null;
            }
        },

        clear() {
            this.profiles = {};
            this.selectedProfileId = null;
        }
    }
});
