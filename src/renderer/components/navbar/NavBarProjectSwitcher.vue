<script setup lang="ts">
import { CheckIcon, ChevronUpIcon, FolderIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCurrentProject } from '@/store/current-project';
import { IpcRendererEvent } from 'electron';
import ProjectInstall from '@/components/navbar/ProjectInstall.vue';
import NavBarMCP from '@/components/navbar/NavBarMCP.vue';
import NavBarXdebug from '@/components/navbar/NavBarXdebug.vue';
import { isSpecialEnvironment } from '@/constants';

const currentProjectStore = useCurrentProject();
const { t } = useI18n();

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
const listbox = ref<HTMLElement | null>(null);

const moveFocus = (step: number) => {
    const options = [...(listbox.value?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const current = options.indexOf(document.activeElement as HTMLElement);
    const next = current === -1 ? options.findIndex((o) => o.ariaSelected === 'true') : current + step;
    options[(Math.max(next, 0) + options.length) % options.length]?.focus();
};

const closeMenu = () => (document.activeElement as HTMLElement | null)?.blur();

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
        buttons: [t('yes'), t('no')],
        title: t('projects.remove_title'),
        message: t('projects.remove_message', { name: formattedName(project.project) })
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
    <div
        class="dropdown dropdown-top dropdown-end"
        @keydown.esc="closeMenu"
    >
        <div
            tabindex="0"
            role="button"
            aria-haspopup="listbox"
            :aria-label="$t('projects.title')"
            class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md font-medium capitalize cursor-pointer transition-colors hover:bg-base-content/10 hover:text-base-content focus-visible:outline-2 focus-visible:outline-primary"
            :class="selectedProject.project ? 'text-base-content/70' : 'text-error'"
            @keydown.down.prevent="moveFocus(1)"
            @keydown.up.prevent="moveFocus(-1)"
        >
            <FolderIcon
                class="size-3.5 shrink-0"
                aria-hidden="true"
            />
            <span
                v-if="selectedProject.project"
                v-text="formattedName(selectedProject.project)"
                :title="formattedName(selectedProject.project)"
                class="max-w-40 truncate"
            />
            <span v-else>{{ $t('no_project_selected') }}</span>
            <ChevronUpIcon
                class="size-3 opacity-50"
                aria-hidden="true"
            />
        </div>

        <div
            tabindex="-1"
            class="dropdown-content mb-2 z-[200] w-56 p-1.5 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10"
        >
            <div class="flex items-center justify-between pl-2 pr-0.5 pb-1">
                <span
                    id="project-switcher-label"
                    class="text-[10px] font-semibold uppercase tracking-wider text-base-content/50"
                    >{{ $t('projects.title') }}</span
                >
                <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-primary"
                    :aria-label="$t('projects.new')"
                    :title="$t('projects.new')"
                    @click="addProject()"
                >
                    <PlusIcon class="size-3.5" />
                </button>
            </div>

            <div
                ref="listbox"
                role="listbox"
                aria-labelledby="project-switcher-label"
                class="flex flex-col gap-px max-h-[32vh] overflow-y-auto overflow-x-hidden xdebug-projects-scroll"
                @keydown.down.prevent="moveFocus(1)"
                @keydown.up.prevent="moveFocus(-1)"
            >
                <div
                    v-for="(project, index) in orderedProjects"
                    :key="project.path + '-dropdown'"
                    role="option"
                    tabindex="0"
                    :aria-selected="selectedProject.path === project.path"
                    :title="project.path"
                    draggable="true"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer outline-none transition-colors hover:bg-base-content/5 focus-visible:bg-base-content/5 focus-visible:ring-2 focus-visible:ring-primary/60"
                    :class="
                        selectedProject.path === project.path
                            ? 'text-base-content font-medium'
                            : 'text-base-content/70 hover:text-base-content'
                    "
                    @dragstart="onProjectDragStart(index)"
                    @dragover.prevent
                    @drop="onProjectDrop(index)"
                    @click="setActiveProject(project)"
                    @keydown.enter.prevent="setActiveProject(project)"
                    @keydown.space.prevent="setActiveProject(project)"
                    @keydown.delete.prevent="removeProject(project)"
                    @contextmenu="openContextMenu($event, project)"
                >
                    <span class="flex-1 truncate capitalize">{{ formattedName(project.project) }}</span>
                    <CheckIcon
                        v-if="selectedProject.path === project.path"
                        class="size-3.5 shrink-0 text-success"
                        aria-hidden="true"
                    />
                </div>
            </div>

            <div
                class="mt-1.5 border-t border-base-content/10 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-base-content/50"
            >
                {{ $t('projects.connections') }}
            </div>
            <NavBarMCP />
            <NavBarXdebug />
        </div>

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
                    <span>{{ $t('remove') }}</span>
                </button>
            </div>
        </Teleport>
    </div>

    <ProjectInstall
        ref="projectInstallRef"
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
