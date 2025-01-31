import { app, Menu, shell } from "electron";

async function getMenuTemplate() {
    const menuTemplate = [
        {
            label: "Menu",
            submenu: [
                {
                    label: "Version: " + app.getVersion(),
                    enabled: false
                },
                {
                    label: "About LaraDumps",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/app");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Quit LaraDumps",
                    accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Documentation",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://laradumps.dev");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Desktop Releases",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/app/releases");
                    }
                },
                {
                    label: "Laravel Package",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/laradumps");
                    }
                },
                {
                    label: "Core Package",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/laradumps-core");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Sponsors",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/sponsors/luanfreitasdev");
                    }
                }
            ]
        }
    ];

    // Enables copy to clipboard in macOS
    if (process.platform === "darwin") {
        menuTemplate.splice(1, 0, {
            label: "Edit",
            submenu: [
                { label: "Undo", role: "undo", accelerator: "CmdOrCtrl+Z" },
                { label: "Redo", role: "redo", accelerator: "Shift+CmdOrCtrl+Z" },
                { type: "separator" },
                { label: "Copy", role: "copy", accelerator: "CmdOrCtrl+C" },
                { label: "Paste", role: "paste", accelerator: "CmdOrCtrl+V" }
            ]
        });
    }

    return menuTemplate;
}

async function createMenu() {
    const menuTemplate = await getMenuTemplate();

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

export { createMenu };
