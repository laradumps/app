import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export function useRowExpand(openId: Ref<string | null> = ref(null)) {
    const isOpen = (id: string) => openId.value === id;
    const toggle = (id: string) => (openId.value = openId.value === id ? null : id);
    const close = () => (openId.value = null);

    const onRowKeydown = (event: KeyboardEvent, id: string) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle(id);
            return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();

        const row = event.currentTarget as HTMLElement;
        const rows = [...(row.closest('[data-row-list]')?.querySelectorAll<HTMLElement>('[data-row-id]') ?? [])];
        const next = rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)];
        if (!next) return;

        next.focus();
        next.scrollIntoView({ block: 'nearest' });
        if (openId.value !== null) openId.value = next.dataset.rowId ?? null;
    };

    const onEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || openId.value === null || event.defaultPrevented) return;
        if (document.querySelector('dialog[open], .modal-open, .drawer-toggle:checked')) return;
        close();
    };

    onMounted(() => window.addEventListener('keydown', onEscape));
    onBeforeUnmount(() => window.removeEventListener('keydown', onEscape));

    return { openId, isOpen, toggle, close, onRowKeydown };
}
