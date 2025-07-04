<script setup lang="ts">
import { ref, onMounted, defineEmits, watch, computed } from "vue";
import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from "chart.js";
import { useTimeStore } from "@/store/time";
import { useQueriesChart } from "@/store/queries-chart";
import { useQueriesPayloadStore } from "@/store/queries";

Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface QueryPayload {
    id: string;
    request_id?: string;
    date_time: string;
    queries: {
        query: {
            time: number;
        };
    };
}

interface ChartPoint {
    id: string;
    time: string;
    value: number;
}

const timeStore = useTimeStore();
const queriesChart = useQueriesChart();
const queriesStore = useQueriesPayloadStore();

const emit = defineEmits<{
    (event: "pointClick", payload: ChartPoint): void;
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<"line"> | null = null;

const chartDataPoints = computed<ChartPoint[]>(() => {
    const payloads = queriesStore.payload as QueryPayload[];

    if (!payloads || payloads.length === 0) return [];

    if (queriesChart.type === "by-request" && timeStore.selected) {
        return payloads
            .filter((item) => item.request_id === timeStore.selected)
            .map((item) => ({
                id: item.id,
                time: item.date_time,
                value: item.queries?.query.time ?? 0
            }));
    }

    if (queriesChart.type === "all") {
        return payloads.map((item) => ({
            id: item.id,
            time: item.date_time,
            value: item.queries?.query.time ?? 0
        }));
    }

    return [];
});

watch(
    chartDataPoints,
    (points) => {
        if (!chartInstance) return;

        chartInstance.data.labels = points.map((p) => new Date(p.time).toLocaleString());
        chartInstance.data.datasets[0].data = points.map((p) => p.value);
        chartInstance.update();
    },
    { immediate: true }
);

onMounted(() => {
    if (!chartCanvas.value) return;

    chartInstance = new Chart(chartCanvas.value, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Duration (ms)",
                    data: [],
                    borderColor: "orange",
                    borderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    pointBackgroundColor: "red",
                    pointHoverBorderColor: "rgba(255, 165, 0, 0.8)",
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { display: false },
                y: { title: { display: true, text: "Duration (ms)" } }
            },
            plugins: {
                tooltip: { enabled: true }
            },
            onClick(event, elements) {
                if (!elements.length) return;
                const index = elements[0].index;
                const selected = chartDataPoints.value[index];
                if (selected) {
                    emit("pointClick", selected);
                }
            }
        }
    });
});

const averageTime = computed<number>(() => {
    if (chartDataPoints.value.length === 0) return 0;
    const sum = chartDataPoints.value.reduce((total, p) => total + p.value, 0);
    return parseFloat((sum / chartDataPoints.value.length).toFixed(2));
});
</script>

<template>
    <div class="py-2 !text-base-content space-y-2">
        <div class="select-none flex justify-end">
            <span class="badge badge-soft">Avg: {{ averageTime }}</span>
        </div>
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>
