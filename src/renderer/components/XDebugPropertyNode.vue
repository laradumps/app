<template>
    <div>
        <div class="property-node">
            <div class="flex gap-1 items-center">
                <button
                    @click="handlePropertyClick"
                    v-if="['array', 'object'].includes(property.type)"
                    class="cursor-pointer"
                >
                    <IconArrowRight v-if="!property.expanded" />
                    <IconArrowDown v-else />
                </button>

                <button
                    v-else
                    class="min-w-4 size-4 cursor-not-allowed"
                ></button>

                <IconListBullet v-show="property.type === 'array'" />
                <IconCodeBrackets v-show="!hasArrayIndexAtEnd(property.fullname) && !['object', 'array'].includes(property.type)" />

                <div>
                    <span
                        :class="{ '!text-primary': ['string', 'int', 'bool', 'array', 'null', 'float'].includes(property.type) }"
                        class="variable-name"
                        >{{ displayVariableName(property) }}</span
                    >

                    <span v-if="property.type === 'null'"> = <span class="text-secondary">null</span></span>

                    <span v-if="property.value">
                        = <span class="text-secondary">{{ formatValue() }}</span></span
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
import XDebugLoadingChildren from "./XDebugLoadingChildren.vue";
import IconArrowRight from "@/components/Icons/IconArrowRight.vue";
import IconArrowDown from "@/components/Icons/IconArrowDown.vue";
import IconListBullet from "@/components/Icons/IconListBullet.vue";
import IconCodeBrackets from "@/components/Icons/IconCodeBrackets.vue";

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
    console.log(`Sending property_get for: ${variableName}`);

    sendCommand(`feature_set -i ${id} -n max_children -v 100`);
    sendCommand(`property_get -i ${id} -n ${variableName} -m 0`);
};

const sendCommand = (cmd): void => {
    window.ipcRenderer.send("send-xdebug-command", cmd);
};
</script>

<style scoped>
.property-node {
    @apply p-1.5 text-sm rounded-md break-all;
}

.children {
    @apply px-4;
}

.variable-name {
    @apply text-primary;
}

.classname {
    @apply text-base-content/50;
}
</style>
