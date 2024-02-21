import { ipcRenderer, webFrame, shell } from "electron";
import express from "express";
import bodyParser from "body-parser";

window.ipcRenderer = ipcRenderer;
window.webFrame = webFrame;
window.shell = shell;

import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";

const port = 9191;
const app = express();

app.use(cors());

app.use(
    bodyParser.urlencoded({
        limit: "50mb",
        extended: true,
        parameterLimit: 50000
    })
);

app.use(
    bodyParser.json({
        limit: "50mb"
    })
);

app.post("/api/dumps", (req, res) => {
    const { body } = req;

    ipcRenderer.send("dump", {
        type: body.type,
        content: body
    });

    return res.send({ id: body.id });
});

const server = app
    .listen(port, "0.0.0.0", () => {})
    .on("error", (err) => {
        console.error(err);
        setTimeout(() => {
            ipcRenderer.send("preload:server-failed", err);
        }, 3000);
    });

ipcRenderer.on("server:close", (event, arg) => {
    server.close(() => {
        event.sender.send("app:quit", arg);
    });
});

ipcRenderer.on("preload:create-static-tmp-file", (event, value) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "temp-"));
    const tmpFile = path.join(tmpDir, "temp.html");

    fs.writeFileSync(tmpFile, value.content);

    app.get(`/${value.name}.html`, (req, res) => {
        res.sendFile(tmpFile);
    });

    app.use(express.static(path.dirname(tmpFile)));
});
