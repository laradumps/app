<script setup lang="ts">
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useCurrentProject } from '@/store/current-project';
import { IpcRendererEvent } from 'electron';
import ProjectInstall from '@/components/navbar/ProjectInstall.vue';
import NavBarMCP from '@/components/navbar/NavBarMCP.vue';
import NavBarXdebug from '@/components/navbar/NavBarXdebug.vue';
import { isSpecialEnvironment } from '@/constants';

const emit = defineEmits(['modalOpen', 'modalClose']);
const currentProjectStore = useCurrentProject();

const IPC_EVENTS = {
    STORAGE_GET: 'storage.get',
    STORAGE_GET_REPLY: 'storage.get.reply',
    STORAGE_SET_ACTIVE_REPLY: 'storage.set-active.reply',
    STORAGE_SET_PROJECTS_ORDER: 'storage.set-projects-order',
    STORAGE_GET_PROJECTS_ORDER: 'storage.get-projects-order',

    APP_SETTING_PROJECT_ADDED: 'app-setting:project-added',

    MAIN_DIALOG: 'main:dialog',
    MAIN_DIALOG_CHOICE: 'main:dialog-choice',

    STORAGE_GET_ENVIRONMENTS_REPLY: 'storage.get-environments.reply',
    STORAGE_REMOVE: 'storage.remove',
    MAIN_PROJECT_SETUP: 'main:project-setup'
} as const;

interface Project {
    path: string;
    project: string;
}

const selectedProject = ref<Project>({} as Project);
const isNewProject = ref(false);
const projects = ref<Project[]>([]);
const windowHeight = ref(window.innerHeight);
const contextMenuProject = ref<Project | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });
const projectInstallRef = ref<InstanceType<typeof ProjectInstall> | null>(null);

const projectsOrder = ref<string[]>([]);

let handleProjectsOrderReply: ((_: IpcRendererEvent, payload: any) => void) | null = null;

onMounted(() => {
    initializeProjectData();
    setupEventListeners();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('click', closeContextMenu);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateHeight);
    window.removeEventListener('click', closeContextMenu);

    window.ipcRenderer.off(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS_REPLY, handleEnvironmentsRetrieved);
    if (handleProjectsOrderReply)
        window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);
});

const updateHeight = () => {
    windowHeight.value = window.innerHeight;
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, ' ') || '';

const handleProjectAdded = async (_: IpcRendererEvent, project: Project) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
    const { default: JSConfetti } = await import('js-confetti');
    new JSConfetti().addConfetti();
    isNewProject.value = true;
    setActiveProject(project);
    setTimeout(() => (isNewProject.value = false), 5000);
};

const handleActiveProjectSet = (_: IpcRendererEvent, project: Project) => {
    setActiveProject(project);
};

const handleProjectsRetrieved = (_: IpcRendererEvent, storedProjects: Record<string, string>) => {
    const projectsArray = Object.entries(storedProjects).map(([project, path]) => ({ project, path }));
    projects.value = projectsArray;

    if (currentProjectStore.projectInfo) {
        const found = projectsArray.find((p) => p.path === currentProjectStore.projectInfo.path);
        if (found) {
            setActiveProject(found);
        }
    }
};

const handleEnvironmentsRetrieved = (_: IpcRendererEvent, envs: any[]) => {
    if (!envs) return;
    envs.forEach((env) => {
        if (!isSpecialEnvironment(env.value)) {
            window.dispatchEvent(new CustomEvent('add-screen', { detail: env }));
        }
    });
};

const setActiveProject = (project: Project) => {
    currentProjectStore.set(project);
    selectedProject.value = project;
    window.ipcRenderer.send('storage.set-active', project.project);
    window.ipcRenderer.send('storage.get-environments', project.path);
    window.ipcRenderer.send('storage.get-yaml', project.path);

    projectInstallRef.value?.closeModal();

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
};

const initializeProjectData = () => {
    if (currentProjectStore.projectInfo) {
        setActiveProject(currentProjectStore.projectInfo);
    }

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
};

const setupEventListeners = () => {
    window.ipcRenderer.on(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS_REPLY, handleEnvironmentsRetrieved);

    handleProjectsOrderReply = (_: IpcRendererEvent, payload: any) => {
        if (Array.isArray(payload)) {
            projectsOrder.value = payload;
        } else if (payload && typeof payload === 'object' && Array.isArray(payload.all)) {
            projectsOrder.value = payload.all;
        }
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);
};

const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: 'base' }));
});

const applyOrder = (list: Project[], order: string[]): Project[] => {
    if (!order || order.length === 0) return list;
    const idx = new Map<string, number>();
    order.forEach((name, i) => idx.set(name, i));
    return [...list].sort((a, b) => {
        const ai = idx.has(a.project) ? (idx.get(a.project) as number) : Number.MAX_SAFE_INTEGER;
        const bi = idx.has(b.project) ? (idx.get(b.project) as number) : Number.MAX_SAFE_INTEGER;
        if (ai === bi) return a.project.localeCompare(b.project, undefined, { sensitivity: 'base' });
        return ai - bi;
    });
};

const orderedProjects = computed(() => {
    return applyOrder(sortedProjects.value, projectsOrder.value);
});

const projDrag = ref<{ index: number | null }>({ index: null });

const onProjectDragStart = (index: number) => {
    projDrag.value = { index };
};

const onProjectDrop = (dropIndex: number) => {
    const index = projDrag.value.index;
    if (index === null) return;

    const working = [...projectsOrder.value];
    const visible = orderedProjects.value.map((p) => p.project);
    const currentOrder = working.length ? working.filter((n) => visible.includes(n)) : visible.slice();

    const [moved] = currentOrder.splice(index, 1);
    currentOrder.splice(dropIndex, 0, moved);

    projectsOrder.value = currentOrder;
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, currentOrder);
    projDrag.value = { index: null };
};

const addProject = () => {
    window.ipcRenderer.send(IPC_EVENTS.MAIN_PROJECT_SETUP);
};

const openContextMenu = (event: MouseEvent, project: Project) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    contextMenuProject.value = project;
    contextMenuPosition.value = {
        x: rect.left,
        y: rect.bottom + 4
    };
};

const closeContextMenu = () => {
    contextMenuProject.value = null;
};

const handleContextMenuClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (contextMenuProject.value) {
        removeProject(contextMenuProject.value);
    }
};

const onProjectAdded = () => {
    isNewProject.value = true;
    setTimeout(() => (isNewProject.value = false), 5000);
};

const removeProject = (project: Project) => {
    const projectPath = project.path;

    window.ipcRenderer.send(IPC_EVENTS.MAIN_DIALOG, {
        buttons: ['Yes', 'No'],
        title: 'Remove Project',
        message: 'Are you sure you want to remove the configuration from this Project?'
    });

    const removeHandler = (_: Event, choice: number) => {
        window.ipcRenderer.off(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);

        if (choice === 0) {
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_REMOVE, projectPath);
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);

            const [firstProject] = projects.value;
            if (firstProject) {
                setActiveProject(firstProject);
            }
        }

        closeContextMenu();
    };

    window.ipcRenderer.on(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);
};
</script>

<template>
    <div class="dropdown dropdown-end">
        <div
            tabindex="0"
            role="button"
            class="flex items-center font-medium capitalize truncate text-xs btn btn-sm border border-base-content/10 shadow-sm justify-between !px-3 !m-0 !h-8 gap-2 bg-base-100 hover:bg-base-200 hover:border-base-content/10 rounded-lg transition-colors"
        >
            <div class="flex items-center gap-2">
                <div
                    v-if="selectedProject.project"
                    class="size-2 rounded-full bg-success"
                ></div>
                <div
                    v-else
                    class="size-2 rounded-full bg-error"
                ></div>
                <span
                    v-if="selectedProject.project"
                    v-text="formattedName(selectedProject.project)"
                    class="max-w-[140px] truncate"
                />
                <span v-else>{{ $t('no_project_selected') }}</span>
            </div>
            <ChevronDownIcon class="size-3 opacity-50" />
        </div>

        <ul
            tabindex="0"
            class="dropdown-content mt-2 z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 w-64"
        >
            <li class="mb-1">
                <a
                    @click="addProject()"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-primary hover:bg-primary/10"
                >
                    <PlusIcon class="size-4" />
                    <span class="font-medium text-xs">New</span>
                </a>
            </li>

            <div class="flex flex-col max-h-[32vh] overflow-y-auto overflow-x-hidden xdebug-projects-scroll -mr-1 pr-1">
                <li
                    v-for="(project, index) in orderedProjects"
                    :key="project.path + '-dropdown'"
                    draggable="true"
                    @dragstart="onProjectDragStart(index)"
                    @dragover.prevent
                    @drop="onProjectDrop(index)"
                    @click="setActiveProject(project)"
                    @contextmenu="openContextMenu($event, project)"
                    class="relative group"
                >
                    <a
                        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                        :class="
                            selectedProject.path === project.path
                                ? 'bg-base-content/10 text-base-content font-medium'
                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                        "
                    >
                        <div class="size-2.5 rounded-full relative flex items-center justify-center">
                            <span
                                v-if="selectedProject.path === project.path"
                                class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                            ></span>
                            <span
                                class="relative inline-flex rounded-full size-2"
                                :class="selectedProject.path === project.path ? 'bg-success' : 'bg-transparent'"
                            ></span>
                        </div>
                        <span class="truncate capitalize text-xs">{{ formattedName(project.project) }}</span>
                    </a>
                </li>
            </div>

            <div
                class="px-3 pb-1 pt-3 font-semibold text-[10px] text-base-content/40 uppercase tracking-widest border-t border-base-content/10 mt-1"
            >
                Servers & Connections
            </div>
            <li>
                <NavBarMCP />
            </li>
            <li>
                <NavBarXdebug />
            </li>
        </ul>

        <!-- Context Menu -->
        <Teleport to="body">
            <div
                v-if="contextMenuProject"
                class="fixed z-[300] bg-base-200 rounded-lg shadow-xl border border-base-content/10 py-1 min-w-[140px]"
                :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
                @click="handleContextMenuClick"
            >
                <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 transition-colors"
                >
                    <TrashIcon class="size-4" />
                    <span>Remove</span>
                </button>
            </div>
        </Teleport>
    </div>

    <ProjectInstall
        ref="projectInstallRef"
        @modal-open="emit('modalOpen')"
        @modal-close="emit('modalClose')"
        @project-added="onProjectAdded"
    />
</template>

<style scoped>
.xdebug-projects-scroll::-webkit-scrollbar {
    width: 6px;
}

.xdebug-projects-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.xdebug-projects-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.35);
    border-radius: 9999px;
}

.xdebug-projects-scroll:hover::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.55);
}
</style>
