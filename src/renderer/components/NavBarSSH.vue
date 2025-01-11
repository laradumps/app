<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ArrowPathIcon, PencilIcon, ServerIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { useSSHStore } from "@/store/ssh";
import Modal from "./Modal.vue";
import { Ref } from "vue";
import { ConnectionConfig } from "@/types/Ssh.type";
import { onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import IconPlus from "@/components/Icons/IconPlus.vue";

const i18n = useI18n();
const sshModal = ref();
const sshStore = useSSHStore();
const form: Ref<ConnectionConfig> = ref({
    id: Date.now(),
    name: "",
    host: "",
    port: 22,
    username: "",
    auth_type: "key",
    password: "",
    private_key: ""
});
const editId = ref<number | null>(null);
const emit = defineEmits(["connected"]);
const listenId = ref<number | null>();

onMounted(() => {
    window.ipcRenderer.on("ssh:connect-response", connectResponse);
    window.ipcRenderer.on("ssh:listen-response", listenResponse);
});

onUnmounted(() => {
    window.ipcRenderer.removeAllListeners("ssh:connect-response");
    window.ipcRenderer.removeAllListeners("ssh:listen-response");
});

const connect = () => {
    if (sshStore.connecting) return;
    sshStore.setConnecting(true);
    if (editId.value) {
        window.ipcRenderer.send("ssh:connect", { ...form.value }, { state: "edit", notify: true });
        return;
    }
    window.ipcRenderer.send("ssh:connect", { ...form.value }, { state: "create", notify: true });
};

const connectResponse = (event: any, response: any) => {
    sshStore.setConnecting(false);

    if (response.data.state === "create" && response.connected) {
        sshStore.addConnection(response.config);
        sshModal.value.closeModal();
        emit("connected");
    }

    if (response.data.state === "edit" && response.connected) {
        sshStore.updateConnection(response.config.id, response.config);
        sshModal.value.closeModal();
        emit("connected");
    }
};

const listen = (id: number, event: any) => {
    window.ipcRenderer.send("ssh:disconnect");
    listenId.value = event.target.checked ? id : null;
    if (listenId.value) {
        sshStore.setConnecting(true);
        let conn = sshStore.getConnection(id);
        window.ipcRenderer.send("ssh:listen", { ...conn });
    }
};

const listenResponse = (event: any, response: any) => {
    sshStore.setConnecting(false);
    if (!response.connected) {
        listenId.value = null;
    }

    console.log(response);
};

const removeConnection = (id: number) => {
    if (listenId.value === id) {
        window.ipcRenderer.send("ssh:disconnect");
        listenId.value = null;
    }
    window.ipcRenderer.on("main:dialog-choice", (event, arg) => {
        if (arg === 0) {
            sshStore.remove(id);
        }
    });
    window.ipcRenderer.send("main:dialog", {
        buttons: [i18n.t("yes"), i18n.t("no")],
        title: i18n.t("ssh.remove_connection"),
        message: i18n.t("ssh.remove_connection_confirm")
    });
};

const addConnection = () => {
    form.value = {
        id: Date.now(),
        name: "",
        host: "",
        port: 22,
        username: "",
        auth_type: "key",
        password: "",
        private_key: ""
    };
    editId.value = null;
    sshModal.value.openModal();
};

const editConnection = (id: number) => {
    let conn = sshStore.getConnection(id);
    form.value = { ...conn };
    editId.value = id;
    sshModal.value.openModal();
};
</script>

<template>
    <div class="dropdown dropdown-left">
        <button
            :title="$t('menu.ssh')"
            class="w-[32px] !h-[34px] tab p-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        >
            <ServerIcon class="w-4" />
        </button>

        <ul
            tabindex="0"
            class="dropdown-content min-w-80 overflow-y-auto z-200 menu p-3 bg-base-200 border border-base-content/20 shadow-lg rounded-md w-auto mt-[35px] !right-0"
        >
            <div class="flex justify-between items-center">
                <span>SSH</span>
                <button
                    class="flex btn btn-warning text-warning-content w-auto text-xs !px-3"
                    @click="addConnection"
                >
                    <IconPlus class="w-4" />
                    Add Connection
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
                    <div class="flex items-center justify-between p-2 my-1">
                        <label class="bg-transparent text-base-content flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                :checked="connection.id === listenId"
                                @change="listen(connection.id, $event)"
                                class="toggle toggle-xs toggle-accent mr-1"
                                :value="connection.id"
                            />
                            <span class="text-[10px] whitespace-nowrap font-semibold uppercase truncate max-w-[100px]">{{ connection.name }}</span>
                        </label>
                        <div class="flex gap-2 items-center justify-end">
                            <template v-if="sshStore.connecting && connection.id === listenId">
                                <button class="p-1">
                                    <ArrowPathIcon class="w-4 animate-spin" />
                                </button>
                            </template>
                            <template v-else>
                                <button class="p-1">
                                    <PencilIcon
                                        @click="editConnection(connection.id)"
                                        class="w-4 hover:text-blue-500"
                                    />
                                </button>
                                <button class="p-1">
                                    <TrashIcon
                                        @click="removeConnection(connection.id)"
                                        class="w-4 hover:text-red-500"
                                    />
                                </button>
                            </template>
                        </div>
                    </div>
                </li>
            </div>

            <div
                v-else
                class="text-xs text-neutral-content"
            >
                No connections!
            </div>
        </ul>

        <Modal
            ref="sshModal"
            :title="editId ? $t('ssh.edit_connection') : $t('ssh.add_connection')"
        >
            <form
                class="mx-auto space-y-3"
                @submit.prevent="connect"
            >
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.name") }}</div>
                    <input
                        type="text"
                        id="name"
                        v-model="form.name"
                        placeholder="production-server"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.host") }}</div>
                    <input
                        type="text"
                        id="host"
                        v-model="form.host"
                        placeholder="1.2.3.4"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.port") }}</div>
                    <input
                        type="number"
                        id="port"
                        v-model="form.port"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.auth_type") }}</div>
                    <select
                        id="auth-type"
                        v-model="form.auth_type"
                        :placeholder="$t('ssh.auth_type')"
                        class="js-shortcut grow select select-bordered select-sm w-full"
                    >
                        <option value="key">Private Key (Recommended)</option>
                        <option value="password">Password</option>
                    </select>
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.username") }}</div>
                    <input
                        type="text"
                        id="username"
                        v-model="form.username"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <Divider />
                <div
                    v-if="form.auth_type === 'password'"
                    class="grid grid-cols-2 items-center"
                >
                    <div>{{ $t("ssh.password") }}</div>
                    <input
                        type="password"
                        id="password"
                        v-model="form.password"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <div
                    v-if="form.auth_type === 'key'"
                    class="grid grid-cols-2 items-center"
                >
                    <div>{{ $t("ssh.private_key") }}</div>
                    <input
                        type="text"
                        id="key"
                        v-model="form.private_key"
                        class="js-shortcut grow input input-bordered input-sm w-full"
                    />
                </div>
                <Divider />
                <div class="flex items-center justify-end">
                    <button
                        class="btn btn-warning text-warning-content mt-6 w-[100px] text-xs"
                        @click="connect"
                    >
                        <ArrowPathIcon
                            v-if="sshStore.connecting"
                            class="w-4 animate-spin"
                        />
                        <span v-else>{{ $t("ssh.connect") }}</span>
                    </button>
                </div>
            </form>
        </Modal>
    </div>
</template>
