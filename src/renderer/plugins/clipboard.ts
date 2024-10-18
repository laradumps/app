export default {
    install: (app: any): void => {
        app.config.globalProperties.$clipboard = (value: any): void => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            navigator.clipboard.writeText(value).then(() => {});
        };
    }
};
