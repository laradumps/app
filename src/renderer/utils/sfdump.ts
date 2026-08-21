export function initSfDump(id?: string | number | null): void {
    if (id == null || typeof window.Sfdump !== 'function') {
        return;
    }

    const elementId = `sf-dump-${id}`;
    const el = document.getElementById(elementId);
    if (!el || el.hasAttribute('has-dump-js')) {
        return;
    }

    el.setAttribute('has-dump-js', 'true');
    window.Sfdump(elementId);
}

export function scheduleSfDump(id?: string | number | null): void {
    const run = () => initSfDump(id);

    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 120 });
        return;
    }

    requestAnimationFrame(run);
}
