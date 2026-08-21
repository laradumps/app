<script setup lang="ts">
import { onMounted } from 'vue';
import { Payload } from '@/types/Payload';
import { IdeHandle } from '@/types/IdeHandle';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { scheduleSfDump } from '@/utils/sfdump';

const props = defineProps<{
    payload: Payload;
}>();

const ideHandlerForItem = (line: number): IdeHandle => ({
    ...props.payload.ide_handle,
    line: String(line)
});

onMounted(() => {
    props.payload.dump_group?.items.forEach((item) => {
        scheduleSfDump(item.sf_dump_id);
    });
});
</script>

<template>
    <div class="flex flex-col w-full gap-4">
        <div
            v-for="item in payload.dump_group?.items"
            :key="item.sf_dump_id"
            class="flex flex-col"
        >
            <!-- variable name + ide link on the same row -->
            <div class="flex items-center justify-between gap-2 mb-0.5">
                <span class="font-mono text-[0.78rem] font-semibold text-base-content/70"> ${{ item.name }} </span>
                <DumpLink
                    :ide-handler="ideHandlerForItem(item.line)"
                    :truncate="true"
                    class="text-[0.65rem] opacity-50 hover:opacity-100 transition-opacity shrink-0"
                />
            </div>

            <!-- sf-dump output -->
            <div class="sf-dump-inline pl-3 border-l-2 border-base-content/10">
                <span
                    :id="`dump-content-${item.sf_dump_id}`"
                    v-html="item.dump"
                />
            </div>
        </div>
    </div>
</template>
