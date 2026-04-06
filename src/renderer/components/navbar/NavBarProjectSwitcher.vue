<script setup lang="ts">
import {
    ExclamationTriangleIcon,
    ChevronDownIcon,
    PlusIcon,
    EllipsisVerticalIcon,
    TrashIcon
} from '@heroicons/vue/24/outline';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import JSConfetti from 'js-confetti';
import { useCurrentProject } from '@/store/current-project';
import { IpcRendererEvent } from 'electron';
import ProjectInstall from '@/components/navbar/ProjectInstall.vue';
import { LogEntry } from '../../../main/logger/logger';
import NavBarMCP from '@/components/navbar/NavBarMCP.vue';
import NavBarXdebug from '@/components/navbar/NavBarXdebug.vue';

const emit = defineEmits(['modalOpen', 'modalClose']);
const currentProjectStore = useCurrentProject();

const IPC_EVENTS = {
    STORAGE_GET: 'storage.get',
    STORAGE_GET_REPLY: 'storage.get.reply',
    STORAGE_SET_ACTIVE_REPLY: 'storage.set-active.reply',
    STORAGE_GET_STARRED: 'storage.get-starred',
    STORAGE_GET_STARRED_REPLY: 'storage.get-starred.reply',
    STORAGE_TOGGLE_STARRED: 'storage.toggle-starred',
    STORAGE_SET_PROJECTS_ORDER: 'storage.set-projects-order',
    STORAGE_GET_PROJECTS_ORDER: 'storage.get-projects-order',

    APP_SETTING_PROJECT_ADDED: 'app-setting:project-added',

    MAIN_DIALOG: 'main:dialog',
    MAIN_DIALOG_CHOICE: 'main:dialog-choice',

    PROJECT_DIRECTORY_SELECTED: 'project-directory-selected',
    COMPOSER_AUTO_INSTALL: 'composer-auto-install',
    PROJECT_SETUP_LOGS: 'project-setup-logs',

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
const dropdownRef = ref<HTMLElement | null>(null);

const installActive = ref(false);
const installErrorMessage = ref('');
const installFinished = ref(false);
const installFailed = ref(false);
const projectSetupLogs = ref('');
const setupLogsTextarea = ref<HTMLTextAreaElement | null>(null);

let errorDismissTimer: number | null = null;

watch(installErrorMessage, (msg) => {
    if (errorDismissTimer) {
        clearTimeout(errorDismissTimer);
        errorDismissTimer = null;
    }
    if (msg) {
        errorDismissTimer = window.setTimeout(() => {
            installErrorMessage.value = '';
        }, 3000);
    }
});

const starredProjects = ref<string[]>([]);
const projectsOrder = ref<{ starred: string[]; all: string[] }>({ starred: [], all: [] });
let handleStarredReplyRef: ((event: IpcRendererEvent, list: string[]) => void) | null = null;
let handleProjectsOrderReply:
    | ((event: IpcRendererEvent, payload: { starred: string[]; all: string[] }) => void)
    | null = null;

let handleComposerRef: ((event: IpcRendererEvent, payload: any) => void) | null = null;
let handleProjectDirSelectedRef: ((_: any, args: any) => void) | null = null;
let handleProjectSetupLogs: (_: any, payload: LogEntry) => void;

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

    if (errorDismissTimer) {
        clearTimeout(errorDismissTimer);
        errorDismissTimer = null;
    }

    window.ipcRenderer.off(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.off('storage.get-environments.reply', handleEnvironmentsRetrieved);
    if (handleComposerRef) window.ipcRenderer.off(IPC_EVENTS.COMPOSER_AUTO_INSTALL, handleComposerRef);
    if (handleProjectDirSelectedRef)
        window.ipcRenderer.off(IPC_EVENTS.PROJECT_DIRECTORY_SELECTED, handleProjectDirSelectedRef);
    if (handleStarredReplyRef) window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_STARRED_REPLY, handleStarredReplyRef);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);
    window.ipcRenderer.off(IPC_EVENTS.PROJECT_SETUP_LOGS, handleProjectSetupLogs);
});

const updateHeight = () => {
    windowHeight.value = window.innerHeight;
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, ' ') || '';

const handleProjectAdded = (_: IpcRendererEvent, project: Project) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
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
        if (!['dump', 'enabled_in_testing', 'original_dump', 'auto_invoke_app'].includes(env.value)) {
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

    closeModal();

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
};

const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
};

const initializeProjectData = () => {
    if (currentProjectStore.projectInfo) {
        setActiveProject(currentProjectStore.projectInfo);
    }

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_STARRED);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setupEventListeners = async () => {
    window.ipcRenderer.on(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.on('storage.get-environments.reply', handleEnvironmentsRetrieved);

    handleProjectsOrderReply = (_: IpcRendererEvent, payload: { starred: string[]; all: string[] }) => {
        if (payload && payload.starred && payload.all) {
            projectsOrder.value = {
                starred: Array.isArray(payload.starred) ? payload.starred : [],
                all: Array.isArray(payload.all) ? payload.all : []
            };
        }
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);

    handleStarredReplyRef = (_: IpcRendererEvent, list: string[]) => {
        if (Array.isArray(list)) starredProjects.value = list;
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_STARRED_REPLY, handleStarredReplyRef);

    // --- Composer auto-install progress
    handleComposerRef = async (_: IpcRendererEvent, payload: any) => {
        if (!payload) return;

        if (payload.status === 'start') {
            installActive.value = true;
            installErrorMessage.value = '';
            installFailed.value = false;
            document.activeElement?.blur();
            modal_navbar_listening.showModal();
            emit('modalOpen');
        }

        if (payload.error) {
            installErrorMessage.value = 'An error occurred while installing.';
            installFailed.value = true;
            return;
        }

        if (payload.step === 'finish' && payload.done) {
            await sleep(500);
            installFinished.value = true;
            await new JSConfetti().addConfetti();
            isNewProject.value = true;
        }
    };

    window.ipcRenderer.on(IPC_EVENTS.COMPOSER_AUTO_INSTALL, handleComposerRef);

    handleProjectSetupLogs = (_: any, payload: LogEntry) => {
        projectSetupLogs.value = `${projectSetupLogs.value}[${new Date(payload.timestamp).toLocaleString()}].${payload.level} ${payload.message}\n`;

        if (setupLogsTextarea.value) {
            setupLogsTextarea.value.scrollTop = setupLogsTextarea.value.scrollHeight;
        }
    };
    window.ipcRenderer.on(IPC_EVENTS.PROJECT_SETUP_LOGS, handleProjectSetupLogs);
};

handleProjectDirSelectedRef = (_: any, args: any) => {
    if (args && typeof args === 'string') {
        window.ipcRenderer.send('storage.check', { applicationPath: args });
    }
};

window.ipcRenderer.on(IPC_EVENTS.PROJECT_DIRECTORY_SELECTED, handleProjectDirSelectedRef);

const confirmProjectRemoval = (projectPath: string) => {
    window.ipcRenderer.send(IPC_EVENTS.MAIN_DIALOG, {
        buttons: ['Yes', 'No'],
        title: 'Remove Project',
        message: 'Are you sure you want to remove the configuration from this Project?'
    });

    const removeHandler = (_: Event, choice: number) => {
        if (choice === 0) {
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_REMOVE, projectPath);
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);

            const [firstProject] = projects.value;
            if (firstProject) {
                setActiveProject(firstProject);
            }
        }
        window.ipcRenderer.off(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);
    };

    window.ipcRenderer.on(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);
};

const baseSortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: 'base' }));
});
// --- End projects sort

// --- Starred projects logic
const starredSet = computed(() => new Set(starredProjects.value));

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

const starredSortedProjects = computed(() => {
    const list = baseSortedProjects.value.filter((p) => p.project && starredSet.value.has(p.project));
    return applyOrder(list, projectsOrder.value.starred);
});

const regularSortedProjects = computed(() => {
    const list = baseSortedProjects.value.filter((p) => p.project && !starredSet.value.has(p.project));
    return applyOrder(list, projectsOrder.value.all);
});

// --- Starred projects actions
const isStarred = (projectName: string): boolean => starredSet.value.has(projectName);
const toggleStar = (projectName: string) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_TOGGLE_STARRED, { project: projectName });

    const wasStarred = isStarred(projectName);
    starredProjects.value = wasStarred
        ? starredProjects.value.filter((n) => n !== projectName)
        : [...starredProjects.value, projectName];

    if (wasStarred) {
        projectsOrder.value.starred = projectsOrder.value.starred.filter((n) => n !== projectName);
        if (!projectsOrder.value.all.includes(projectName)) {
            projectsOrder.value.all = [...projectsOrder.value.all, projectName];
        }
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, {
            list: 'starred',
            order: projectsOrder.value.starred
        });
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: 'all', order: projectsOrder.value.all });
    } else {
        projectsOrder.value.all = projectsOrder.value.all.filter((n) => n !== projectName);
        if (!projectsOrder.value.starred.includes(projectName)) {
            projectsOrder.value.starred = [...projectsOrder.value.starred, projectName];
        }
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: 'all', order: projectsOrder.value.all });
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, {
            list: 'starred',
            order: projectsOrder.value.starred
        });
    }
};
// --- End starred projects logic

// --- Drag & Drop to reorder projects (starred and all)
const projDrag = ref<{ list: 'starred' | 'all' | null; index: number | null }>({ list: null, index: null });

const onProjectDragStart = (list: 'starred' | 'all', index: number) => {
    projDrag.value = { list, index };
};

const onProjectDrop = (list: 'starred' | 'all', dropIndex: number) => {
    const { list: fromList, index } = projDrag.value;
    if (!fromList || index === null || fromList !== list) return; // only allow reorder within same list

    const working = list === 'starred' ? [...projectsOrder.value.starred] : [...projectsOrder.value.all];

    // Build current names list from visible computed lists to ensure we reorder by names
    const visible = (list === 'starred' ? starredSortedProjects.value : regularSortedProjects.value).map(
        (p) => p.project
    );

    // Ensure working contains all visible in order; if not, initialize with visible
    const currentOrder = working.length ? working.filter((n) => visible.includes(n)) : visible.slice();

    const [moved] = currentOrder.splice(index, 1);
    currentOrder.splice(dropIndex, 0, moved);

    if (list === 'starred') {
        projectsOrder.value.starred = currentOrder;
    } else {
        projectsOrder.value.all = currentOrder;
    }

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, {
        list,
        order: currentOrder
    });

    projDrag.value = { list: null, index: null };
};

const addProject = () => {
    window.ipcRenderer.send(IPC_EVENTS.MAIN_PROJECT_SETUP);
};

const openContextMenu = (event: MouseEvent, project: Project) => {
    event.preventDefault();
    contextMenuProject.value = project;
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
};

const closeContextMenu = () => {
    contextMenuProject.value = null;
};

const removeProject = (project: Project) => {
    confirmProjectRemoval(project.path);
    closeContextMenu();
};

const resetInstallState = () => {
    installActive.value = false;
    installFinished.value = false;
    installFailed.value = false;
    projectSetupLogs.value = '';
    installErrorMessage.value = '';
};

const finishInstallation = () => {
    resetInstallState();
    modal_navbar_listening.close();
};

const showModal = () => {
    resetInstallState();
    modal_navbar_listening.showModal();
    emit('modalOpen');
};
const closeModal = () => {
    if (installActive.value && !installFinished.value && !installFailed.value) {
        return;
    }
    modal_navbar_listening.close();
    emit('modalClose');
};
</script>

<template>
    <div class="dropdown dropdown-end">
        <div
            tabindex="0"
            role="button"
            class="flex items-center font-medium capitalize truncate text-xs btn btn-sm border border-base-content/10 shadow-sm justify-between !px-3 !m-0 !h-7 gap-2 bg-base-100 hover:bg-base-200 hover:border-base-content/20 rounded-lg transition-colors"
        >
            <div class="flex items-center gap-2">
                <div
                    v-if="selectedProject.project"
                    class="size-2 rounded-full bg-success shadow-[0_0_8px_rgba(0,180,0,0.6)]"
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
            class="dropdown-content mt-2 z-[200] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 w-64"
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

            <template v-if="starredSortedProjects.length > 0">
                <li
                    v-for="(project, sIdx) in starredSortedProjects"
                    :key="project.path + '-dropdown'"
                    draggable="true"
                    @dragstart="onProjectDragStart('starred', sIdx)"
                    @dragover.prevent
                    @drop="onProjectDrop('starred', sIdx)"
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
                                :class="
                                    selectedProject.path === project.path
                                        ? 'bg-success shadow-[0_0_6px_rgba(0,255,0,0.8)]'
                                        : 'bg-transparent'
                                "
                            ></span>
                        </div>
                        <span class="truncate capitalize text-xs">{{ formattedName(project.project) }}</span>
                    </a>
                    <button
                        @click.stop="openContextMenu($event, project)"
                        class="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-base-content/10 transition-opacity"
                    >
                        <EllipsisVerticalIcon class="size-4 text-base-content/50" />
                    </button>
                </li>
            </template>

            <template v-if="regularSortedProjects.length > 0">
                <li
                    v-for="(project, aIdx) in regularSortedProjects"
                    :key="project.path + '-dropdown'"
                    draggable="true"
                    @dragstart="onProjectDragStart('all', aIdx)"
                    @dragover.prevent
                    @drop="onProjectDrop('all', aIdx)"
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
                                :class="
                                    selectedProject.path === project.path
                                        ? 'bg-success shadow-[0_0_6px_rgba(0,255,0,0.8)]'
                                        : 'bg-transparent'
                                "
                            ></span>
                        </div>
                        <span class="truncate capitalize text-xs">{{ formattedName(project.project) }}</span>
                    </a>
                    <button
                        @click.stop="openContextMenu($event, project)"
                        class="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-base-content/10 transition-opacity"
                    >
                        <EllipsisVerticalIcon class="size-4 text-base-content/50" />
                    </button>
                </li>
            </template>

            <div class="px-3 pb-1 pt-3 font-semibold text-[10px] text-base-content/40 uppercase tracking-widest">
                Servers & Connections
            </div>
            <li>
                <NavBarMCP />
            </li>
            <li>
                <NavBarXdebug />
            </li>
        </ul>
        <dialog
            @close.prevent="closeModal"
            id="modal_navbar_listening"
            class="modal z-[200]"
        >
            <div
                class="modal-box max-w-4xl p-0! bg-base-100 shadow-2xl border border-base-content/10 rounded-2xl overflow-hidden"
            >
                <!-- Error banner -->
                <div
                    v-if="installErrorMessage"
                    role="alert"
                    class="alert alert-error rounded-none border-x-0 border-t-0 border-b border-base-content/10 shadow-none z-10"
                >
                    <ExclamationTriangleIcon class="size-6 shrink-0" />
                    <span>{{ installErrorMessage }}</span>
                </div>

                <div class="flex h-144">
                    <div class="flex-1 flex flex-col relative bg-base-100 overflow-y-auto w-full">
                        <div class="p-8 flex flex-col h-full gap-4">
                            <ProjectInstall
                                :install-active="installActive"
                                :install-finished="installFinished"
                                :install-failed="installFailed"
                                :install-error-message="installErrorMessage"
                                :project-setup-logs="projectSetupLogs"
                                @retry="addProject"
                                @finish="finishInstallation"
                                @copy-logs="copyToClipboard"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Context Menu -->
            <div
                v-if="contextMenuProject"
                class="fixed z-[300] bg-base-200 rounded-lg shadow-xl border border-base-content/10 py-1 min-w-[140px]"
                :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
            >
                <button
                    @click="removeProject(contextMenuProject)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 transition-colors"
                >
                    <TrashIcon class="size-4" />
                    <span>Remove</span>
                </button>
            </div>

            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
