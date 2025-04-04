<script setup>
import { ref, onMounted, defineProps, defineEmits, watch, computed } from "vue";
import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from "chart.js";

Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const props = defineProps({
    dataPoints: Array
});

const emit = defineEmits(["pointClick"]);

const chartCanvas = ref(null);
let chartInstance = null;

watch(
    () => props.dataPoints,
    (value) => {
        if (chartInstance) {
            chartInstance.data.labels = value.map((item) => new Date(item.time).toLocaleString());
            chartInstance.data.datasets[0].data = value.map((item) => item.value);
            chartInstance.update();
        }
    },
    { deep: true }
);

onMounted(() => {
    if (!props.dataPoints || props.dataPoints.length === 0) return;

    const labels = props.dataPoints.map((point) => new Date(point.time).toLocaleString());
    const firstLabel = labels[0];
    const lastLabel = labels[labels.length - 1];

    chartInstance = new Chart(chartCanvas.value, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Duration (ms)",
                    data: props.dataPoints.map((d) => d.value),
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
                x: {
                    display: false
                },
                y: { title: { display: true, text: "Duration (ms)" } }
            },
            plugins: {
                tooltip: {
                    enabled: true
                },
                annotation: {
                    annotations: [
                        {
                            type: "label",
                            xValue: 0,
                            yValue: props.dataPoints[0].value,
                            content: firstLabel,
                            backgroundColor: "rgba(255, 165, 0, 0.8)",
                            color: "white",
                            position: "top",
                            font: { weight: "bold" },
                            padding: 6
                        },
                        {
                            type: "label",
                            xValue: labels.length - 1,
                            yValue: props.dataPoints[props.dataPoints.length - 1].value,
                            content: lastLabel,
                            backgroundColor: "rgba(255, 165, 0, 0.8)",
                            color: "white",
                            position: "top",
                            font: { weight: "bold" },
                            padding: 6
                        }
                    ]
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    emit("pointClick", index);
                }
            }
        }
    });
});

const calculateTimeAvg = computed(() => {
    if (!props.dataPoints || props.dataPoints.length === 0) return 0;
    const total = props.dataPoints.reduce((acc, d) => acc + d.value, 0);
    return (total / props.dataPoints.length).toFixed(2);
});
</script>
<template>
    <div class="bg-base-300 rounded-box p-4 !text-base-content space-y-2">
        <div class="select-none flex justify-between">
            <span class="badge badge-soft">Avg: {{ calculateTimeAvg }}</span>
        </div>
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>
