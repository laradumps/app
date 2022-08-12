import { ipcRenderer } from 'electron';
import express from 'express';
import bodyParser from 'body-parser';
import Pusher from 'pusher';

const cors = require('cors');

const port = 9191;
const app = express();

app.use(cors());

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

    // eslint-disable-next-line no-prototype-builtins
    if (body.hasOwnProperty('pusher') && body.pusher != '') {
        window.Pusher = new Pusher({
            appId: body.pusher.app_id,
            key: body.pusher.key,
            secret: body.pusher.secret,
            cluster: body.pusher.options.cluster,
            useTLS: true,
            disableStats: true,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
        });
    }

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
