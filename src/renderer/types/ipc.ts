import { Payload } from '@/types/Payload';
import { Environment } from '../../main/storage';

interface ScreenWindowPayload {
    screen: string;
    payload: Payload[];
    jobs: any[];
    mails: any[];
    logs: any[];
    queries: any[];
    brains: any[];
}

/**
 * Channels the renderer listens on (`ipc.on` / `ipc.off`), keyed by the exact
 * channel string used on the wire, mapped to the payload the handler receives.
 */
export interface IpcReceiveEvents {
    // Dump / payload channels
    dump: { content: Payload };
    dump_group: { content: Payload };
    'dump.batches': { type: 'batch'; contents: { content: Payload }[] };
    html: { content: Payload };
    mailable: { content: Payload };
    table_v2: { content: Payload };
    table: { content: Payload };
    'http-client': { content: Payload };
    model: { content: Payload };
    json: { content: Payload };
    query: { content: Payload };
    livewire: { content: Payload };
    xdebug: { content: Payload };
    jobs: { content: Payload };
    mail: { content: Payload };
    label: { content: Payload };
    context: { content: Payload };
    log_application: { content: Payload };
    color: { content: Payload };
    screen: { content: Payload };
    json_validate: { content: Payload };
    validate: { content: Payload };
    time_track: { content: Payload };
    brain: { content: Payload };
    profiler: { content: Payload };

    // App / window channels
    'main:app-version.reply': { version: string };
    'app:screen-window-enable': ScreenWindowPayload;
    'app:screen-window-update': Omit<ScreenWindowPayload, 'screen'>;
    'screen-window:closed': string;

    // Xdebug channels
    'xdebug-connected': void;
    'xdebug-disconnected': void;

    // Storage channels
    'storage.get-environments.reply': Environment[];
    'storage.get-yaml.reply': Record<string, any>;
    'storage.update-section.reply': { section: string; values: any; error?: string };

    // Saved dumps
    'saved-dumps:remove': { id: string };

    // Tail log channels
    'tail-log:entries': any[];
    'tail-log:reset': void;
    'tail-log:meta': { filePath?: string };
    'tail-log:error': string;
    'tail-log:file-picked': { filePath: string };
}

export type IpcReceiveChannel = keyof IpcReceiveEvents;
