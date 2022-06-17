import Alpine from 'alpinejs';
import Clipboard from '@ryangjchandler/alpine-clipboard';
import app from './app';
import dumper from '@/js/alpinejs/dumper';
import './store';

window.app = app;
window.dumper = dumper;
Alpine.plugin(Clipboard);

Alpine.data('app', app);
Alpine.data('dumper', dumper);
