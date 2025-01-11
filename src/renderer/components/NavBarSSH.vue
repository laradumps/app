<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ArrowPathIcon, PencilIcon, ServerIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { useSSHStore } from "@/store/ssh";
import Modal from "./Modal.vue";
import { Ref } from "vue";
import { ConnectionConfig } from "@/types/Ssh.type";
import TextInput from "./TextInput.vue";
import SelectInput from "./SelectInput.vue";
import { onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

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
            class="dropdown-content min-w-40 overflow-y-auto z-200 menu p-2 bg-neutral border border-neutral-content/20 shadow-lg rounded-box w-auto mt-[35px] !right-0"
        >
            <div
                v-if="sshStore.connections.length > 0"
                class="overflow-auto space-y-1"
                style="height: calc(100vh - 11rem)"
            >
                <li
                    v-for="connection in sshStore.connections"
                    :key="`connection-${connection.id}`"
                >
                    <div class="flex items-center justify-between p-1.5">
                        <label
                            class="bg-transparent text-neutral-content flex items-center cursor-pointer"
                            :class="{ 'bg-base-200': 1 }"
                        >
                            <input
                                type="checkbox"
                                :checked="connection.id === listenId"
                                @change="listen(connection.id, $event)"
                                class="toggle toggle-xs toggle-accent mr-1"
                                :value="connection.id"
                            />
                            <span class="text-[10px] whitespace-nowrap font-semibold uppercase truncate max-w-[100px]">{{ connection.name }}</span>
                        </label>
                        <div class="flex w-[50px] items-center justify-end">
                            <template v-if="sshStore.connecting && connection.id === listenId">
                                <ArrowPathIcon class="w-4 animate-spin" />
                            </template>
                            <template v-else>
                                <PencilIcon
                                    @click="editConnection(connection.id)"
                                    class="w-4 hover:text-blue-500 mr-1"
                                />
                                <TrashIcon
                                    @click="removeConnection(connection.id)"
                                    class="w-4 hover:text-red-500"
                                />
                            </template>
                        </div>
                    </div>
                </li>
            </div>

            <div
                v-else
                class="text-[10px] text-neutral-content"
            >
                No connections!
            </div>

            <div>
                <button
                    class="btn btn-warning text-warning-content mt-6 w-[100px] text-[10px]"
                    @click="addConnection"
                >
                    Add Connection
                </button>
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
                    <TextInput
                        id="name"
                        v-model="form.name"
                        placeholder="production-server"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.host") }}</div>
                    <TextInput
                        id="host"
                        v-model="form.host"
                        placeholder="1.2.3.4"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.port") }}</div>
                    <TextInput
                        id="port"
                        v-model="form.port"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.auth_type") }}</div>
                    <SelectInput
                        id="auth-type"
                        v-model="form.auth_type"
                        :placeholder="$t('ssh.auth_type')"
                    >
                        <option value="key">Private Key (Recommended)</option>
                        <option value="password">Password</option>
                    </SelectInput>
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>{{ $t("ssh.username") }}</div>
                    <TextInput
                        id="username"
                        v-model="form.username"
                    />
                </div>
                <Divider />
                <div
                    v-if="form.auth_type === 'password'"
                    class="grid grid-cols-2 items-center"
                >
                    <div>{{ $t("ssh.password") }}</div>
                    <TextInput
                        id="password"
                        type="password"
                        v-model="form.password"
                    />
                </div>
                <div
                    v-if="form.auth_type === 'key'"
                    class="grid grid-cols-2 items-center"
                >
                    <div>{{ $t("ssh.private_key") }}</div>
                    <TextInput
                        id="key"
                        v-model="form.private_key"
                    />
                </div>
                <Divider />
                <div class="flex items-center justify-end">
                    <button
                        class="btn btn-warning text-warning-content mt-6 w-[100px] text-[10px]"
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
