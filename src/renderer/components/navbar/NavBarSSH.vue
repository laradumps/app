<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import { ServerIcon } from '@heroicons/vue/24/solid';
import { ServerIcon as ServerIconOutline } from '@heroicons/vue/24/outline';
import MenuRow from '@/components/navbar/MenuRow.vue';
import MenuSubpanel from '@/components/navbar/MenuSubpanel.vue';

import { useSSHStore } from '@/store/ssh';
import { Ref } from 'vue';
import { ConnectionConfig } from '@/types/ssh.type';
import { onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from '@heroicons/vue/24/outline';
import Divider from '@/components/common/Divider.vue';
import { ArrowUpTrayIcon } from '@heroicons/vue/20/solid';
import { useConfirm } from '@/composables/useConfirm';

const i18n = useI18n();
const confirmAction = useConfirm();
const connected = ref(false);
const sshStore = useSSHStore();
const form: Ref<ConnectionConfig> = ref({
    id: Date.now(),
    name: '',
    host: '',
    port: 22,
    username: '',
    auth_type: 'key',
    password: '',
    private_key: '',
    passphrase: '',
    new_window: false,
    connected: false
});
const editId = ref<number | null>(null);
const emit = defineEmits(['connected']);
const listenId = ref<number | null>();
const view = inject<Ref<string>>('menuView', ref('root'));

const listening = computed(() => sshStore.connections.find((c: ConnectionConfig) => c.id === listenId.value)?.name);

onMounted(() => {
    window.ipcRenderer.on('ssh:connect-response', connectResponse);
    window.ipcRenderer.on('ssh:listen-response', listenResponse);
});

onUnmounted(() => {
    window.ipcRenderer.removeAllListeners('ssh:connect-response');
    window.ipcRenderer.removeAllListeners('ssh:listen-response');
    window.ipcRenderer.removeAllListeners('choose-file-response');
});

const connect = () => {
    if (sshStore.connecting) return;
    sshStore.setConnecting(true);

    if (editId.value) {
        window.ipcRenderer.send('ssh:connect', { ...form.value }, { state: 'edit', notify: true });
        return;
    }
    window.ipcRenderer.send('ssh:connect', { ...form.value }, { state: 'create', notify: true });
};

const connectResponse = (event: any, response: any) => {
    sshStore.setConnecting(false);

    if (response.data.state === 'create' && response.connected) {
        sshStore.addConnection(response.config);
        ssh_modal.close();
        emit('connected');
    }

    if (response.data.state === 'edit' && response.connected) {
        sshStore.updateConnection(response.config.id, response.config);
        ssh_modal.close();
        emit('connected');
    }
};

const listen = (id: number, event: any) => {
    connected.value = false;
    window.ipcRenderer.send('ssh:disconnect');
    listenId.value = event.target.checked ? id : null;
    if (listenId.value) {
        sshStore.setConnecting(true);
        let conn = sshStore.getConnection(id);
        window.ipcRenderer.send('ssh:listen', { ...conn });
    } else {
        const connection: ConnectionConfig | undefined = sshStore.getConnection(id);

        if (connection) {
            connection.connected = false;
            sshStore.updateConnection(id, connection);
        }
    }
};

const listenResponse = (event: any, response: { connected: boolean }) => {
    sshStore.setConnecting(false);

    connected.value = response.connected;

    if (listenId.value) {
        const connection: ConnectionConfig | undefined = sshStore.getConnection(listenId.value);
        if (connection) {
            connection.connected = true;
            sshStore.updateConnection(listenId.value, connection);
        }

        return;
    }

    window.ipcRenderer.send('ssh:disconnect');
};

const removeConnection = async (id: number) => {
    if (!(await confirmAction(i18n.t('ssh.remove_connection'), i18n.t('ssh.remove_connection_confirm')))) return;

    if (listenId.value === id) {
        window.ipcRenderer.send('ssh:disconnect');
        listenId.value = null;
    }
    sshStore.remove(id);
};

const removeEditing = async () => {
    const id = editId.value;
    if (!id) return;
    ssh_modal.close();
    await removeConnection(id);
};

const addConnection = () => {
    form.value = {
        id: Date.now(),
        name: '',
        host: '',
        port: 22,
        username: '',
        auth_type: 'key',
        password: '',
        private_key: '',
        new_window: false,
        connected: false
    };
    editId.value = null;
    ssh_modal.showModal();
};

const editConnection = (id: number) => {
    let conn = sshStore.getConnection(id);
    form.value = { ...conn };
    editId.value = id;
    ssh_modal.showModal();
};

const chooseFile = () => {
    window.ipcRenderer.send('choose-file');
};

window.ipcRenderer.on('choose-file-response', (_, filePath) => {
    form.value.passphrase = '';
    form.value.private_key = filePath;
});
</script>

<template>
    <MenuRow
        v-show="view === 'root'"
        :label="$t('menu.ssh')"
        :value="listening ?? $t('menu.off')"
        drill
        data-opens="ssh"
        @click="view = 'ssh'"
    >
        <ServerIcon
            v-if="connected"
            class="size-4 text-success"
        />
        <ServerIconOutline
            v-else
            class="size-4"
        />
    </MenuRow>

    <MenuSubpanel
        v-if="view === 'ssh'"
        :title="$t('menu.ssh')"
    >
        <template #action>
            <button
                type="button"
                :aria-label="$t('ssh.add_connection')"
                :title="$t('ssh.add_connection')"
                class="grid place-items-center size-6 rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
                @click="addConnection"
            >
                <PlusIcon class="size-4" />
            </button>
        </template>

        <div
            v-for="connection in sshStore.connections"
            :key="`connection-${connection.id}`"
            class="flex items-center w-full h-8 gap-2.5 px-2 rounded-md text-[0.8rem] text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
        >
            <span
                aria-hidden="true"
                class="size-1.5 shrink-0 rounded-full"
                :class="connected && connection.id === listenId ? 'bg-success' : 'bg-base-content/20'"
            ></span>
            <button
                type="button"
                :title="$t('ssh.edit_connection')"
                class="flex-1 min-w-0 truncate text-left cursor-pointer"
                @click="editConnection(connection.id)"
            >
                {{ connection.name }}
            </button>
            <ArrowPathIcon
                v-if="sshStore.connecting && connection.id === listenId"
                class="size-3.5 shrink-0 animate-spin"
            />
            <input
                type="checkbox"
                class="toggle toggle-xs toggle-accent shrink-0"
                :aria-label="connection.name"
                :checked="connection.id === listenId"
                @change="listen(connection.id, $event)"
            />
        </div>

        <MenuRow
            v-if="sshStore.connections.length === 0"
            :label="$t('ssh.add_connection')"
            @click="addConnection"
        >
            <PlusIcon class="size-4" />
        </MenuRow>
    </MenuSubpanel>

    <dialog
        id="ssh_modal"
        data-keep-open
        class="modal"
    >
        <div class="modal-box">
            <h3 class="text-lg font-bold">
                {{ editId ? $t('ssh.edit_connection') : $t('ssh.add_connection') }}
            </h3>
            <div class="py-4">
                <form
                    class="mx-auto space-y-3 text-left text-sm"
                    @submit.prevent="connect"
                >
                    <div class="grid grid-cols-3 items-center">
                        <div>{{ $t('ssh.name') }}</div>
                        <input
                            type="text"
                            id="name"
                            v-model="form.name"
                            placeholder="production-server"
                            class="input input-base w-full col-span-2"
                        />
                    </div>
                    <Divider />
                    <div class="grid grid-cols-3 items-center">
                        <div>{{ $t('ssh.host') }}</div>
                        <input
                            type="text"
                            id="host"
                            v-model="form.host"
                            placeholder="1.2.3.4"
                            class="input input-bordered input-base w-full col-span-2"
                        />
                    </div>
                    <Divider />
                    <div class="grid grid-cols-3 items-center">
                        <div>{{ $t('ssh.port') }}</div>
                        <input
                            type="number"
                            id="port"
                            v-model="form.port"
                            class="input input-bordered input-base w-full col-span-2"
                        />
                    </div>
                    <Divider />
                    <div class="grid grid-cols-3 items-center">
                        <div>{{ $t('ssh.auth_type') }}</div>
                        <select
                            id="auth-type"
                            v-model="form.auth_type"
                            :placeholder="$t('ssh.auth_type')"
                            class="grow select select-bordered select-base w-full col-span-2"
                        >
                            <option value="key">Private Key (Recommended)</option>
                            <option value="password">Password</option>
                        </select>
                    </div>
                    <Divider />
                    <div class="grid grid-cols-3 items-center">
                        <div>{{ $t('ssh.username') }}</div>
                        <input
                            type="text"
                            id="username"
                            v-model="form.username"
                            class="input input-bordered input-base w-full col-span-2"
                        />
                    </div>
                    <Divider />
                    <div
                        v-if="form.auth_type === 'password'"
                        class="grid grid-cols-3 items-center"
                    >
                        <div>{{ $t('ssh.password') }}</div>
                        <input
                            type="password"
                            id="password"
                            v-model="form.password"
                            class="input input-bordered input-base w-full col-span-2"
                        />
                    </div>
                    <div
                        v-if="form.auth_type === 'key'"
                        class="grid grid-cols-3 items-center"
                    >
                        <div>{{ $t('ssh.private_key') }}</div>
                        <div class="join col-span-2">
                            <div class="w-full">
                                <label class="input join-item input-bordered input-base">
                                    <input
                                        type="text"
                                        id="key"
                                        v-model="form.private_key"
                                        placeholder="/Users/username/.ssh/id_rsa"
                                        class="w-full placeholder:opacity-70"
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                @click="chooseFile"
                                class="btn btn-neutral join-item"
                            >
                                <span class="text-xs">
                                    <ArrowUpTrayIcon class="w-4" />
                                </span>
                            </button>
                        </div>
                    </div>
                    <Divider v-if="form.auth_type === 'key'" />
                    <div
                        v-if="form.auth_type === 'key'"
                        class="grid grid-cols-3 items-center"
                    >
                        <div>Passphrase</div>
                        <input
                            type="password"
                            id="passphrase"
                            v-model="form.passphrase"
                            :disabled="form.private_key === ''"
                            class="input input-bordered input-base w-full col-span-2"
                        />
                    </div>
                    <Divider />
                    <div class="grid grid-cols-3 items-center">
                        <label>Show in new window</label>
                        <input
                            type="checkbox"
                            v-model="form.new_window"
                            class="toggle toggle-primary col-span-2"
                        />
                    </div>
                    <Divider />
                    <div class="flex items-center justify-end gap-3">
                        <button
                            v-if="editId"
                            type="button"
                            class="btn btn-ghost text-error mt-6 mr-auto"
                            @click="removeEditing"
                        >
                            {{ $t('remove') }}
                        </button>
                        <div class="modal-action">
                            <form method="dialog">
                                <button class="btn">Close</button>
                            </form>
                        </div>
                        <button
                            class="btn btn-primary mt-6 w-[100px] text-xs"
                            @click="connect"
                        >
                            <ArrowPathIcon
                                v-if="sshStore.connecting"
                                class="w-4 animate-spin"
                            />
                            <span v-else>{{ $t('ssh.connect') }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </dialog>
</template>
