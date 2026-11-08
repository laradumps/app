<template>
    <div class="ml-2">
        <div class="property-node p-1">
            <div
                class="flex gap-1 items-center text-gray-400 cursor-pointer whitespace-pre-wrap"
                @click="toggle"
            >
                <button v-if="['array', 'object'].includes(property.type)">
                    <IconArrowRight v-if="!expanded" />
                    <IconArrowDown v-else />
                </button>

                <button
                    v-else
                    class="min-w-4 size-4 cursor-default"
                ></button>

                <IconListBullet v-show="property.type === 'array'" />

                <div>
                    <span class="variable-name">{{ property.name }}</span>

                    <span v-if="value !== null">
                        =
                        <span
                            class="text-secondary"
                            style="white-space: break-spaces"
                            >{{ value }}</span
                        ></span
                    >

                    <span class="classname">{{ ' {' + (property.classname ?? property.type) + '}' }}</span>
                </div>
            </div>
        </div>

        <div
            v-if="expanded"
            class="children"
        >
            <XDebugPropertyNode
                v-for="child in children"
                :key="child.fullname ?? child.name"
                :property="child"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import IconArrowRight from '@/components/Icons/IconArrowRight.vue';
import IconArrowDown from '@/components/Icons/IconArrowDown.vue';
import IconListBullet from '@/components/Icons/IconListBullet.vue';
import { formatValue, type XDebugProperty } from './dbgp';

const props = defineProps<{ property: XDebugProperty }>();

const getProperty = inject<(fullname: string) => Promise<XDebugProperty | null>>('xdebug:get-property');

const expanded = ref(false);
const loaded = ref<XDebugProperty[] | null>(null);

const value = computed(() => formatValue(props.property));
const children = computed(() => loaded.value ?? props.property.children);

const load = async () => {
    const { fullname, numchildren } = props.property;
    if (props.property.children.length || !numchildren || !fullname) return;

    loaded.value = (await getProperty(fullname))?.children ?? [];
};

const toggle = () => {
    expanded.value = !expanded.value;
    if (expanded.value && !loaded.value) load();
};

watch(
    () => props.property,
    () => {
        loaded.value = null;
        if (expanded.value) load();
    }
);
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
