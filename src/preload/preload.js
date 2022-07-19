import { ipcRenderer } from 'electron';
import express from 'express';
import bodyParser from 'body-parser';

const port = 9191;
const app = express();

app.use(bodyParser.urlencoded(
    {
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
    },
));
app.use(bodyParser.json(
    {
        limit: '50mb',
    },
));

app.post('/api/dumps', (req, res) => {
    const { body } = req;

    ipcRenderer.send('dump', {
        type: body.type,
        content: body,
    });

    return res.send(body.id);
});

const server = app.listen(port, '0.0.0.0', () => {}).on('error', (err) => {
    setTimeout(() => { ipcRenderer.send('preload:server-failed', err); }, 3000);
});

ipcRenderer.on('server:close', (event, arg) => {
    server.close(() => {
        event.sender.send('app:quit', arg);
    });
});
