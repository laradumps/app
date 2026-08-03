<script setup lang="ts">
import { useJobStore } from '@/store/jobs';
import { useScreenStore } from '@/store/screen';
import { BriefcaseIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
    relatedJob: { job_id: string; display_name: string };
    originId?: string;
}>();

const jobStore = useJobStore();
const screenStore = useScreenStore();

const goToJob = () => {
    jobStore.requestFocus(props.relatedJob.job_id, {
        screen: screenStore.screen,
        id: props.originId
    });
    screenStore.activeScreen('jobs');
};
</script>

<template>
    <button
        type="button"
        @click.stop="goToJob"
        class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap bg-base-300 hover:bg-base-200 cursor-pointer shrink-0"
        :title="`Open related job: ${relatedJob.display_name}`"
    >
        <BriefcaseIcon class="w-3" />
        <span class="truncate max-w-[160px]">{{ relatedJob.display_name }}</span>
    </button>
</template>
