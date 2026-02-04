<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ArrowPathIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { ServerIcon } from '@heroicons/vue/24/solid';
import { ServerIcon as ServerIconOutline } from '@heroicons/vue/24/outline';

import { useSSHStore } from '@/store/ssh';
import { Ref } from 'vue';
import { ConnectionConfig } from '@/types/ssh.type';
import { onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from '@heroicons/vue/24/outline';
import Divider from '@/components/common/Divider.vue';
import { ArrowUpTrayIcon } from '@heroicons/vue/20/solid';

const i18n = useI18n();
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

const removeConnection = (id: number) => {
    if (listenId.value === id) {
        window.ipcRenderer.send('ssh:disconnect');
        listenId.value = null;
    }
    window.ipcRenderer.on('main:dialog-choice', (event, arg) => {
        if (arg === 0) {
            sshStore.remove(id);
        }
    });
    window.ipcRenderer.send('main:dialog', {
        buttons: [i18n.t('yes'), i18n.t('no')],
        title: i18n.t('ssh.remove_connection'),
        message: i18n.t('ssh.remove_connection_confirm')
    });
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
    <div class="dropdown dropdown-left">
        <button
            :title="$t('menu.ssh')"
            class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        >
            <ServerIcon
                v-if="connected"
                class="w-4 text-primary"
            />
            <ServerIconOutline
                v-else
                class="w-4"
            />
        </button>

        <ul
            tabindex="0"
            class="dropdown-content min-w-80 overflow-y-auto z-[350] menu p-3 bg-base-200 border border-base-content/20 shadow-lg rounded-md w-auto mt-[44px] !-right-[4.8rem]"
        >
            <div class="flex justify-between items-center">
                <span class="font-semibold">SSH</span>
                <button
                    class="flex btn-sm btn btn-primary text-primary-content w-auto text-xs !px-3"
                    @click="addConnection"
                >
                    <PlusIcon class="w-4" />
                    {{ $t('ssh.add_connection') }}
                </button>
            </div>
            <div
                v-if="sshStore.connections.length > 0"
                class="overflow-auto space-y-1 mt-2"
            >
                <li
                    v-for="connection in sshStore.connections"
                    :key="`connection-${connection.id}`"
                >
                    <div class="flex items-center justify-between px-0.5 my-1">
                        <label class="bg-transparent gap-1 text-base-content flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                :checked="connection.id === listenId"
                                @change="listen(connection.id, $event)"
                                class="toggle toggle-sm toggle-primary mr-1"
                                :value="connection.id"
                            />
                            <span class="text-xs whitespace-nowrap font-semibold uppercase truncate max-w-[100px]">{{
                                connection.name
                            }}</span>
                        </label>
                        <div class="flex gap-2 items-center justify-end">
                            <template v-if="sshStore.connecting && connection.id === listenId">
                                <button class="p-1">
                                    <ArrowPathIcon class="w-5 animate-spin" />
                                </button>
                            </template>
                            <template v-else>
                                <button class="btn btn-sm p-[0.5rem] btn-circle btn-ghost">
                                    <PencilIcon
                                        @click="editConnection(connection.id)"
                                        class="w-4"
                                    />
                                </button>
                                <button class="btn btn-sm p-[0.5rem] btn-circle btn-ghost hover:btn-error">
                                    <TrashIcon
                                        @click="removeConnection(connection.id)"
                                        class="w-4"
                                    />
                                </button>
                            </template>
                        </div>
                    </div>
                </li>
            </div>

            <div
                v-else
                class="text-xs text-base-content mt-5"
            >
                No connections!
            </div>
        </ul>

        <dialog
            id="ssh_modal"
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
    </div>
</template>
