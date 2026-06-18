import { ref } from 'vue';

/**
 * Teleport target for toasts.
 *
 * A native <dialog> opened with showModal() renders in the browser's top layer,
 * which sits above every z-index in the normal DOM. To keep toasts visible above
 * such a modal, they must be teleported into an element that also lives in the top
 * layer (i.e. a descendant of the open dialog). When no modal is active this stays
 * null and toasts render in <body> as usual.
 */
export const toastHost = ref<HTMLElement | null>(null);
