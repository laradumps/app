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

const BATCH_SIZE = 12;
let batchBuffer = [];
let batchTimeout = null;

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

const sendBatch = () => {
    if (batchBuffer.length === 0) return;

    ipcRenderer.send("dump.batches", {
        type: "batch",
        contents: [...batchBuffer],
        batch_size: batchBuffer.length
    });

    batchBuffer = [];
    clearTimeout(batchTimeout);
    batchTimeout = null;
};

app.post("/api/dumps", (req, res) => {
    const { body } = req;
    body.date_time = new Date();

    if (body.type === "queries") {
        batchBuffer.push({
            type: body.type,
            content: body
        });

        if (batchBuffer.length >= BATCH_SIZE) {
            sendBatch();
        } else if (!batchTimeout) {
            batchTimeout = setTimeout(sendBatch, 100);
        }

        return res.send({ id: body.id });
    }

    ipcRenderer.send("dump", {
        type: body.type,
        content: body
    });

    return res.send({ id: body.id });
});

app.get("/api/mcp/logs", (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.logStore) {
            return res.status(503).send({ error: "Store not initialized" });
        }
        res.send(window.LaraDumps.logStore.logs);
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.get("/api/mcp/queries", (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.queriesStore) {
            return res.status(503).send({ error: "Store not initialized" });
        }
        res.send(window.LaraDumps.queriesStore.payload);
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.get("/api/mcp/jobs", (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.jobStore) {
            return res.status(503).send({ error: "Store not initialized" });
        }
        res.send(window.LaraDumps.jobStore.jobs);
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.get("/api/mcp/brains", (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.brainStore) {
            return res.status(503).send({ error: "Store not initialized" });
        }
        res.send(window.LaraDumps.brainStore.brains);
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

const server = app
    .listen(port, "0.0.0.0", () => {})
    .on("error", (err) => {
        console.error(err);
        setTimeout(() => ipcRenderer.send("preload:server-failed", err), 3000);
    });

ipcRenderer.on("server:close", (event, arg) => {
    sendBatch();
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
