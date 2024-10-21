import { createApp } from "vue";
import App from "@/App.vue";
import "@/styles.css";

import "highlight.js/styles/xcode.css";
import hljs from "highlight.js/lib/core";
import php from "highlight.js/lib/languages/php";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import en from "@/lang/en";
import ptBR from "@/lang/pt-BR";
import esES from "@/lang/es-ES";
import faIR from "@/lang/fa-IR";
import arAR from "@/lang/ar-AR";
import itIT from "@/lang/it-IT";
import zhCN from "@/lang/zh-CN";
import idID from "@/lang/id-ID";
import alAL from "@/lang/al-AL";
import trTR from "@/lang/tr-TR";

import clipboard from "@/plugins/clipboard";

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
        pt_BR: ptBR,
        es_ES: esES,
        fa_IR: faIR,
        ar_AR: arAR,
        it_IT: itIT,
        zh_CN: zhCN,
        id_ID: idID,
        al_AL: alAL,
        tr_TR: trTR
    }
});

const app = createApp(App);

app.use(hljsVuePlugin);
app.use(pinia);
app.use(i18n);
app.use(clipboard);

app.mount("#app");

window.app = app;
