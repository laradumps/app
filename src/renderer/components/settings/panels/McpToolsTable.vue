<script setup lang="ts">
defineProps<{
    title: string;
    nameHeader: string;
    rows: { name: string; description: string }[];
}>();
</script>

<template>
    <div class="flex flex-col gap-2">
        <h3 class="font-bold text-sm">{{ title }}</h3>
        <div class="overflow-x-auto border border-base-300 rounded-lg">
            <table class="table table-sm table-zebra">
                <thead>
                    <tr class="bg-base-200">
                        <th>{{ nameHeader }}</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="row in rows"
                        :key="row.name"
                    >
                        <td class="font-mono text-xs font-bold">{{ row.name }}</td>
                        <td class="text-xs">{{ row.description }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
