import Alpine from 'alpinejs';

Alpine.store('darkMode', {
    dark: localStorage.darkMode === 'true',
    toggle() {
        localStorage.darkMode = !this.dark;
        this.dark = !this.dark;
    },
});
