<template>
    <div class="ml-2">
        <div class="property-node p-1">
            <div
                class="flex gap-1 items-center text-gray-400 cursor-pointer whitespace-pre-wrap"
                @click="handlePropertyClick"
            >
                <button v-if="['array', 'object'].includes(property.type)">
                    <IconArrowRight v-if="!property.expanded" />
                    <IconArrowDown v-else />
                </button>

                <button
                    v-else
                    class="min-w-4 size-4 cursor-default"
                ></button>

                <IconListBullet v-show="property.type === 'array'" />

                <div>
                    <span class="variable-name">{{ displayVariableName(property) }}</span>

                    <span v-if="property.type === 'null'"> = <span class="text-secondary">null</span></span>

                    <span v-if="property.value">
                        =
                        <span
                            class="text-secondary"
                            style="white-space: break-spaces"
                            >{{ formatValue() }}</span
                        ></span
                    >

                    <span class="classname">{{ " {" + (property.classname ?? property.type) + "}" }}</span>
                </div>
            </div>
        </div>

        <XDebugLoadingChildren
            v-if="loadingChildren"
            :variable-name="property.fullname"
            :transition-id="transitionId"
            @loaded="onChildrenLoaded"
        />

        <div
            v-if="property.expanded"
            class="children"
        >
            <XDebugPropertyNode
                v-for="child in property.children"
                :key="child.fullname"
                :property="child"
                :transition-id="transitionId"
                @request-load-children="loadChildren"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from "vue";
import XDebugLoadingChildren from "@/components/xdebug/XDebugLoadingChildren.vue";
import IconArrowRight from "@/components/Icons/IconArrowRight.vue";
import IconArrowDown from "@/components/Icons/IconArrowDown.vue";
import IconListBullet from "@/components/Icons/IconListBullet.vue";

const props = defineProps({
    property: Object,
    transitionId: Number
});

const loadingChildren = ref(false);

const hasArrayIndexAtEnd = (classname) => {
    const regex = /\[\d+\]$/;
    return regex.test(classname);
};

const formatValue = (): string => {
    if (["bool", "int", "float"].includes(props.property.type)) {
        return props.property.value;
    }

    if (props.property.type === "null") {
        return "null";
    }

    return `"${props.property.value}"`;
};

const displayVariableName = (): string => {
    return props.property.name;
};

const handlePropertyClick = (): boolean => {
    if (props.property.expanded) {
        props.property.expanded = false;
        return;
    }

    if (props.property.children.length === 0) {
        loadingChildren.value = true;
    }

    props.property.expanded = true;
};

const onChildrenLoaded = (newChildren): void => {
    loadingChildren.value = false;
    props.property.children.push(...newChildren);
};

const loadChildren = (): void => {
    loadingChildren.value = true;
    propertyGet(props.property.fullname);
};

const propertyGet = (variableName): void => {
    const id = props.transitionId;
    sendCommand(`feature_set -i ${id} -n max_children -v 100`);
    sendCommand(`property_get -i ${id} -n ${variableName} -m 0`);
};

const sendCommand = (cmd): void => {
    window.ipcRenderer.send("send-xdebug-command", cmd);
};
</script>

<style scoped>
@reference "./../../styles.css";

.property-node {
    @apply p-1.5 text-sm rounded-md whitespace-nowrap;
}

.children {
    @apply px-4;
}

.variable-name {
    @apply text-[#61aeee];
}

.classname {
    @apply text-base-content/50 text-xs;
}
.property-node * {
    flex-shrink: 0;
}
</style>
