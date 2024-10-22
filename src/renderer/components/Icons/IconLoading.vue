<template>
    <svg
        class="opacity-0"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        xml:space="preserve"
        stroke="currentColor"
    >
        <path
            class="spinner"
            d="M2,12A10.94,10.94,0,0,1,5,4.65c-.21-.19-.42-.36-.62-.55h0A11,11,0,0,0,12,23c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"
        />
    </svg>
</template>
<style>
.spinner {
    transform-origin: center;
    animation: spinner_r 0.7s linear infinite;
}

@keyframes spinner_r {
    100% {
        transform: rotate(360deg);
    }
}
</style>
