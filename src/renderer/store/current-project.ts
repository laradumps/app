import { defineStore } from 'pinia';

export interface Project {
    path: string;
    project: string;
}

export const useCurrentProject = defineStore('currentProject', {
    state: () => ({
        projectInfo: JSON.parse(localStorage.getItem('selectedProject') || 'null') as Project
    }),
    actions: {
        set(value: Project) {
            localStorage.setItem('selectedProject', JSON.stringify(value));
            this.projectInfo = value;
        },
        remove() {
            localStorage.removeItem('selectedProject');
            this.projectInfo = { path: '', project: '' };
        }
    }
});
