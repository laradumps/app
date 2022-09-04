import Alpine from 'alpinejs';
import tippy from 'tippy.js';

Alpine.magic('title', (el) => (content) => {
    const instance = tippy(el, {
        content,
        trigger: 'manual',
        animation: 'scale',
        placement: 'right-end',
        theme: 'light',
        allowHTML: true,
    });

    instance.show();

    el.addEventListener('mouseleave', () => {
        setTimeout(() => instance.hide(), 150);
    });
});
