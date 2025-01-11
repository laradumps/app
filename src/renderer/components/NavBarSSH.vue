<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ArrowPathIcon, ServerIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { useSSHStore } from "@/store/ssh";
import Modal from "./Modal.vue";
import { Ref } from "vue";
import { ConnectionConfig } from "@/types/Ssh.type";
import TextInput from "./TextInput.vue";
import SelectInput from "./SelectInput.vue";
import { onUnmounted } from "vue";

const addSSHModal = ref();
const sshStore = useSSHStore();
const form: Ref<ConnectionConfig> = ref({
    id: Date.now(),
    name: "vito-demo",
    host: "91.107.146.132",
    port: 22,
    username: "vito",
    auth_type: "key",
    password: "",
    private_key: "/Users/saeed/.ssh/id_rsa"
});
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
    window.ipcRenderer.send("ssh:connect", { ...form.value }, { state: "create", notify: true });
};

const connectResponse = (event: any, response: any) => {
    sshStore.setConnecting(false);

    if (response.data.state === "create" && response.connected) {
        sshStore.addConnection(response.config);
        addSSHModal.value.closeModal();
        emit("connected");
    }

    if (response.data.state === "edit" && response.connected) {
        sshStore.updateConnection(response.config.id, response.config);
        addSSHModal.value.closeModal();
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
    sshStore.remove(id);
};
</script>

<template>
    <div class="dropdown dropdown-left">
        <button
            :title="$t('ssh')"
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
                            <span class="text-[10px] whitespace-nowrap font-semibold uppercase">{{ connection.name }}</span>
                        </label>
                        <span v-if="sshStore.connecting && connection.id === listenId">
                            <ArrowPathIcon class="w-4 animate-spin" />
                        </span>
                        <span v-else>
                            <TrashIcon
                                @click="removeConnection(connection.id)"
                                class="w-4 hover:text-red-500"
                            />
                        </span>
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
                    @click="addSSHModal.openModal()"
                >
                    Add Connection
                </button>
            </div>
        </ul>

        <Modal
            ref="addSSHModal"
            :title="$t('Add SSH Connection')"
        >
            <form
                class="mx-auto space-y-3"
                @submit.prevent="connect"
            >
                <div class="grid grid-cols-2 items-center">
                    <div>Name</div>
                    <TextInput
                        id="name"
                        v-model="form.name"
                        placeholder="production-server"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>Host</div>
                    <TextInput
                        id="host"
                        v-model="form.host"
                        placeholder="1.2.3.4"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>Port</div>
                    <TextInput
                        id="port"
                        v-model="form.port"
                    />
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>Authentication Type</div>
                    <SelectInput
                        id="auth-type"
                        v-model="form.auth_type"
                        placeholder="Authentication Type"
                    >
                        <option value="key">Private Key (Recommended)</option>
                        <option value="password">Password</option>
                    </SelectInput>
                </div>
                <Divider />
                <div class="grid grid-cols-2 items-center">
                    <div>Username</div>
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
                    <div>Password</div>
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
                    <div>Private Key Path</div>
                    <TextInput
                        id="key"
                        v-model="form.private_key"
                        placeholder="path to private key"
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
                        <span v-else>Connect</span>
                    </button>
                </div>
            </form>
        </Modal>
    </div>
</template>
