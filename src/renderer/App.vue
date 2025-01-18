<template>
    <div>
        <main class="w-full h-full">
            <RouterView :key="$route.fullPath" />
        </main>
    </div>
</template>
<script setup lang="ts">
</script>
