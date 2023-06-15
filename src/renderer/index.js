import { createApp } from "vue";
import App from "@/App.vue";
import "@/styles.css";

import { VTooltip } from "floating-vue";
import "highlight.js/styles/xcode.css";
import hljs from "highlight.js/lib/core";
import php from "highlight.js/lib/languages/php";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import en from "@/lang/en";
import ptBR from "@/lang/pt-BR";

import clipboard from "@/plugins/clipboard";

import "floating-vue/dist/style.css";
import "vue-json-pretty/lib/styles.css";
import "@/sf-dump";

const pinia = createPinia();

hljs.registerLanguage("php", php);
hljs.highlightAll();

const i18n = createI18n({
    locale: "en",
    legacy: false,
    fallbackLocale: "en",
    fallbackWarn: false,
    silentFallbackWarn: true,
    messages: {
        en,
        pt_BR: ptBR
    }
});

const app = createApp(App);

app.directive("tooltip", VTooltip);
app.use(hljsVuePlugin);
app.use(pinia);
app.use(i18n);
app.use(clipboard);

app.mount("#app");

window.app = app;
