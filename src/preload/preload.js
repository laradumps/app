import { ipcRenderer, webFrame, shell } from 'electron';
import express from 'express';
import bodyParser from 'body-parser';

window.ipcRenderer = ipcRenderer;
window.webFrame = webFrame;
window.shell = shell;

if (!window.LaraDumps) {
    window.LaraDumps = {
        logStore: null,
        jobStore: null,
        brainStore: null,
        queriesStore: null,
        settingsStore: null,
        payloadStore: null,
        currentProjectStore: null,
        mailStore: null,
        livewireStore: null,
        clearAll: null,
        confetti: null
    };
}

import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { applyLimit, slimForMcp, slimMailMeta, buildMailDetail, parseMailParts } from './utils.js';

const port = 9191;
const app = express();

const BATCH_SIZE = 12;
let batchBuffer = [];
let batchTimeout = null;

app.use(cors());

app.use(
    bodyParser.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000
    })
);

app.use(
    bodyParser.json({
        limit: '50mb'
    })
);

app.use((err, req, res, _next) => {
    console.error('[Preload Server Error]', err);
    if (!res.headersSent) {
        res.status(500).send({
            error: err?.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
        });
    }
});

const sendBatch = () => {
    if (batchBuffer.length === 0) return;

    ipcRenderer.send('dump.batches', {
        type: 'batch',
        contents: [...batchBuffer],
        batch_size: batchBuffer.length
    });

    batchBuffer = [];
    clearTimeout(batchTimeout);
    batchTimeout = null;
};

app.post('/api/dumps', (req, res) => {
    const { body } = req;
    body.date_time = new Date();

    if (body.type === 'queries') {
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

    ipcRenderer.send('dump', {
        type: body.type,
        content: body
    });

    return res.send({ id: body.id });
});

app.use((req, res, next) => {
    console.log(`[Preload Server] ${req.method} ${req.path}`);
    next();
});

app.get('/api/mcp/health', (req, res) => {
    try {
        const healthStatus = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            store_initialized: !!window.LaraDumps
        };

        res.send(healthStatus);
    } catch (e) {
        console.error('[MCP Health Check Error]', e);
        res.status(500).send({
            status: 'error',
            error: e.toString(),
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/mcp/logs', (req, res) => {
    try {
        const logs = applyLimit(window.LaraDumps?.logStore?.logs);
        res.send(slimForMcp(logs));
    } catch (e) {
        console.error('[MCP Logs Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving logs' });
    }
});

app.get('/api/mcp/queries', (req, res) => {
    try {
        const queries = applyLimit(window.LaraDumps?.queriesStore?.payload);
        res.send(slimForMcp(queries));
    } catch (e) {
        console.error('[MCP Queries Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving queries' });
    }
});

app.get('/api/mcp/queries-full', (req, res) => {
    try {
        const queries = applyLimit(window.LaraDumps?.queriesStore?.payload);
        res.send(queries);
    } catch (e) {
        console.error('[MCP Queries Full Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving queries' });
    }
});

app.get('/api/mcp/problematic-queries', (req, res) => {
    try {
        const queries = window.LaraDumps?.queriesStore?.payload || [];

        const requestSqlCounts = new Map();
        for (const item of queries) {
            if (item.queries?.query?.sql) {
                const requestId = item.request_id;
                const sql = item.queries.query.sql;

                if (!requestSqlCounts.has(requestId)) {
                    requestSqlCounts.set(requestId, new Map());
                }
                const sqlMap = requestSqlCounts.get(requestId);
                sqlMap.set(sql, (sqlMap.get(sql) || 0) + 1);
            }
        }

        const duplicatesInfo = [];
        for (const [requestId, sqlMap] of requestSqlCounts.entries()) {
            for (const [sql, count] of sqlMap.entries()) {
                if (count > 1) {
                    duplicatesInfo.push({
                        request_id: requestId,
                        sql: sql,
                        occurrences: count
                    });
                }
            }
        }

        const duplicatedSqls = new Set(duplicatesInfo.map((d) => d.sql));

        const problematicQueries = queries.filter((query) => {
            const hasExplainNodes = query.queries?.explain_nodes && query.queries.explain_nodes.length > 0;
            const isDuplicated = duplicatedSqls.has(query.queries?.query?.sql);
            return hasExplainNodes || isDuplicated;
        });

        const enrichedQueries = problematicQueries.map((query) => {
            const sql = query.queries?.query?.sql || '';
            const hasExplainNodes = query.queries?.explain_nodes && query.queries.explain_nodes.length > 0;
            const isDuplicated = duplicatedSqls.has(sql);
            const duplicateInfo = duplicatesInfo.find((d) => d.sql === sql);

            return {
                id: query.id,
                request_id: query.request_id,
                date_time: query.date_time,
                sql: sql,
                time: query.queries?.query?.time || 0,
                database: query.queries?.database || '',
                bindings: query.queries?.query?.bindings || [],
                uri: query.queries?.uri || '',
                method: query.queries?.method || '',
                explain_nodes: query.queries?.explain_nodes || [],
                ide_handle: query.ide_handle
                    ? {
                          real_path: query.ide_handle.real_path,
                          class_name: query.ide_handle.class_name,
                          line: query.ide_handle.line
                      }
                    : null,
                _problematic: {
                    has_explain_nodes: hasExplainNodes,
                    is_duplicated: isDuplicated,
                    occurrences: duplicateInfo?.occurrences || 1
                }
            };
        });

        const limit = parseInt(req.query.limit) || enrichedQueries.length;
        res.send(enrichedQueries.slice(-limit));
    } catch (e) {
        console.error('[MCP Problematic Queries Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving queries' });
    }
});

app.get('/api/mcp/jobs', (req, res) => {
    try {
        const jobs = applyLimit(window.LaraDumps?.jobStore?.jobs);
        res.send(slimForMcp(jobs));
    } catch (e) {
        console.error('[MCP Jobs Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving jobs' });
    }
});

app.get('/api/mcp/brains', (req, res) => {
    try {
        const brains = applyLimit(window.LaraDumps?.brainStore?.brains);
        res.send(slimForMcp(brains));
    } catch (e) {
        console.error('[MCP Brains Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving brains' });
    }
});

app.get('/api/mcp/dumps', (req, res) => {
    try {
        const dumps = applyLimit(window.LaraDumps?.payloadStore?.payload);
        res.send(slimForMcp(dumps));
    } catch (e) {
        console.error('[MCP Dumps Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving dumps' });
    }
});

app.get('/api/mcp/project-info', (req, res) => {
    try {
        if (!window.LaraDumps?.currentProjectStore?.projectInfo) {
            return res.status(503).send({ error: 'Store not initialized' });
        }
        res.send(window.LaraDumps.currentProjectStore.projectInfo);
    } catch (e) {
        console.error('[MCP Project Info Error]', e);
        res.status(503).send({ error: e.toString() });
    }
});

app.get('/api/mcp/mails', (req, res) => {
    try {
        const mails = applyLimit(window.LaraDumps?.mailStore?.mails);
        res.send(mails.map(slimMailMeta));
    } catch (e) {
        console.error('[MCP Mails Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving mails' });
    }
});

const MAIL_DEFAULT_PARTS = ['meta'];
const MAIL_DEFAULT_TEXT_MAX_LENGTH = 2000;

app.get('/api/mcp/mails/:messageId', (req, res) => {
    try {
        const store = window.LaraDumps?.mailStore;
        if (!store) {
            return res.status(503).send({ error: 'Store not initialized' });
        }
        const mail = (store.mails || []).find((m) => m.message_id === req.params.messageId);
        if (!mail) {
            return res.status(404).send({ error: `Mail not found: ${req.params.messageId}` });
        }

        const parts = parseMailParts(req.query.parts) || MAIL_DEFAULT_PARTS;
        const maxTextLength = parseInt(req.query.max_length, 10) || MAIL_DEFAULT_TEXT_MAX_LENGTH;

        res.send(buildMailDetail(mail, parts, { maxTextLength }));
    } catch (e) {
        console.error('[MCP Mail Detail Error]', e);
        res.status(503).send({ error: e?.message || 'Error retrieving mail' });
    }
});

app.get('/api/mcp/livewire', (req, res) => {
    try {
        const livewire = applyLimit(window.LaraDumps?.livewireStore?.requests);
        res.send(slimForMcp(livewire));
    } catch (e) {
        console.error('[MCP Livewire Error]', e);
        res.status(503).send({ error: 'Store not initialized or error retrieving livewire' });
    }
});

app.get('/api/mcp/search', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.send([]);
        }

        const timeoutId = setTimeout(() => {
            console.error('[MCP Search] Timeout waiting for global-search.reply');
            if (!res.headersSent) {
                res.status(500).send({ error: 'Timeout performing search' });
            }
        }, 5000);

        window.ipcRenderer.once('global-search.reply', (e, args) => {
            clearTimeout(timeoutId);
            try {
                if (!res.headersSent) {
                    res.send(args);
                }
            } catch (error) {
                console.error('[MCP Search] Error sending response', error);
            }
        });

        window.ipcRenderer.send('global-search', q);
    } catch (e) {
        console.error('[MCP Search] Error', e);
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/confetti', (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.confetti) {
            return res.status(503).send({ error: 'Store or confetti not initialized' });
        }
        window.LaraDumps.confetti();
        res.send({ status: 'success' });
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/clear-jobs', (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.jobStore) {
            return res.status(503).send({ error: 'Store not initialized' });
        }
        window.LaraDumps.jobStore.clear();
        res.send({ status: 'success' });
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/clear-mails', (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.mailStore) {
            return res.status(503).send({ error: 'Store not initialized' });
        }
        window.LaraDumps.mailStore.clear();
        res.send({ status: 'success' });
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/clear-logs', (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.logStore) {
            return res.status(503).send({ error: 'Store not initialized' });
        }
        window.LaraDumps.logStore.clear();
        res.send({ status: 'success' });
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/clear-dumps', (req, res) => {
    try {
        if (!window.LaraDumps || !window.LaraDumps.clearAll) {
            return res.status(503).send({ error: 'Store or clearAll not initialized' });
        }
        window.LaraDumps.clearAll();
        res.send({ status: 'success' });
    } catch (e) {
        res.status(500).send({ error: e.toString() });
    }
});

app.post('/api/mcp/toggle-env', (req, res) => {
    try {
        const { env, action } = req.body;

        if (!window.LaraDumps || !window.LaraDumps.currentProjectStore) {
            return res.status(503).send({ error: 'Store not initialized' });
        }

        const projectPath = window.LaraDumps.currentProjectStore.projectInfo?.path;

        if (!projectPath) {
            return res.status(400).send({ error: 'No active project' });
        }

        const timeoutId = setTimeout(() => {
            console.error('[MCP Toggle Env] Timeout waiting for storage.get-environments.reply');
            if (!res.headersSent) {
                res.status(500).send({ error: 'Timeout waiting for environment data' });
            }
        }, 5000);

        ipcRenderer.once('storage.get-environments.reply', (event, envs) => {
            clearTimeout(timeoutId);

            try {
                const targetEnv = envs.find((e) => e.value === env);

                if (targetEnv) {
                    let newState;
                    if (action === 'enable') newState = true;
                    else if (action === 'disable') newState = false;
                    else newState = !targetEnv.selected;

                    if (newState !== targetEnv.selected) {
                        targetEnv.selected = newState;

                        ipcRenderer.send('storage.update', {
                            selected: envs.map((e) => ({ value: e.value, selected: e.selected })),
                            path: projectPath
                        });

                        const ignored = ['dump', 'enabled_in_testing', 'original_dump', 'auto_invoke_app'];
                        if (!ignored.includes(env)) {
                            window.dispatchEvent(new CustomEvent('add-screen', { detail: targetEnv }));
                        }
                    }

                    res.send({
                        status: 'success',
                        env: targetEnv.value,
                        enabled: newState
                    });
                } else {
                    res.status(404).send({ error: `Environment ${env} not found` });
                }
            } catch (error) {
                console.error('[MCP Toggle Env] Error in reply handler', error);
                if (!res.headersSent) {
                    res.status(500).send({ error: error.toString() });
                }
            }
        });

        ipcRenderer.send('storage.get-environments', projectPath);
    } catch (e) {
        console.error('[MCP Toggle Env] Error', e);
        res.status(500).send({ error: e.toString() });
    }
});

async function startServer() {
    const server = app
        .listen(port, '0.0.0.0', () => {
            console.log(`[Preload Server] Started on port ${port}`);
        })
        .on('error', (err) => {
            console.error(`[Preload Server] Error: ${err.message}`, err);
            setTimeout(() => ipcRenderer.send('preload:server-failed', err), 3000);
        });

    ipcRenderer.on('server:close', (event, arg) => {
        sendBatch();
        server.close(() => {
            event.sender.send('app:quit', arg);
        });
    });

    const tempFiles = new Map();

    ipcRenderer.on('preload:create-static-tmp-file', (event, value) => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-'));
        const tmpFile = path.join(tmpDir, 'temp.html');

        fs.writeFileSync(tmpFile, value.content);
        tempFiles.set(value.name, tmpFile);
    });

    app.get('/temp/:id.html', (req, res) => {
        const filePath = tempFiles.get(req.params.id);
        if (filePath && fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('File not found');
        }
    });

    app.use((req, res) => {
        console.error(`[Preload Server] 404: ${req.method} ${req.path}`);
        res.status(404).send({ error: `Route not found: ${req.method} ${req.path}` });
    });
}

startServer();
