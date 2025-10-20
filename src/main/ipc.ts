import { dialog, ipcMain } from "electron";
import fs from "fs/promises";

ipcMain.handle("save-dialog", async (event, options) => {
    return await dialog.showSaveDialog(options);
});

ipcMain.handle("write-file", async (event, { path, content }) => {
    await fs.writeFile(path, content, "utf-8");
    return { success: true };
});
