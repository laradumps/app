import Alpine from 'alpinejs';

import app from './app';
import shortcut from '@/js/alpinejs/shortcut';
import dumper from '@/js/alpinejs/dumper';
import './store';

import './directives/title';

window.app = app;
window.dumper = dumper;

Alpine.data('app', app);
Alpine.data('dumper', dumper);
Alpine.data('shortcuts', shortcut);
