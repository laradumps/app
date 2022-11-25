import { ipcMain } from 'electron';

const minPackageVersion = '1.5.0';
let packageVersion;

export default async function () {
    ipcMain.on('dump', (event, arg) => {
        packageVersion = arg.content.meta.laradumps_version.replaceAll('.', '');

        // eslint-disable-next-line no-restricted-globals
        if (!isNaN(packageVersion) && (packageVersion < minPackageVersion.replaceAll('.', ''))) {
            // eslint-disable-next-line no-shadow
            const payload = {
                packageVersion,
                minPackageVersion,
                dialogTitle: '✨ LaraDumps Package Update Available!',
                dialogDescription: `
            <div class="text-left px-5">
                <p>Hey dev,</p>
                <br/>
                <p>There is a new release of LaraDumps Laravel Package.</p>
                <br/>
                <p>Consider upgrading to enjoy the benefits of new features, bug fixes and improvements.</p>
                <br/>
                <p><span class="font-semibold">To upgrade LaraDumps in your project, run:</span></p>
                <div class="mt-5">
                    <span class="p-1.5 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                    <button x-on:mouseenter="$title('Click to copy')" x-on:click="clipboard('composer upgrade laradumps/laradumps', 'copyComposerIcon')">
                    <div class="flex justify-between dark:text-slate-700">
                        <span>composer upgrade laradumps/laradumps</span>
                        <div title="Click to copy">
                            <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                x-ref="copyComposerIcon"
                                viewBox="0 0 24 24" stroke="#485569">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                    </div>
                    </button>
                    </span>
                </div>
                <div class="mt-5">
                    <p>Installed version: <span class="font-semibold">${arg.content.meta.laradumps_version}</span></p>
                    <p>Mininum required version: <span class="font-semibold">${minPackageVersion}</span></p>
                </div>
                <div class="mt-5">
                    <p>For more information, visit:</p>
                    <div class="mt-2 cursor-pointer font-semibold" x-on:click="openLink('https://github.com/laradumps/laradumps')">https://github.com/laradumps/laradumps</div>
                </div>
            </div>          
        `,
            };
            event.sender.send('ipc:package-down', payload);
        } else {
            event.sender.send(arg.type, arg);
        }
    });
    ipcMain.on('preload:server-failed', (event) => {
        event.sender.send('preload:server-failed', {
            dialogTitle: 'Server failed',
            dialogDescription: 'A server has already been started or is in memory. Please restart the computer or kill the process',
        });
    });
    ipcMain.on('app', (event, arg) => {
        event.sender.send('app', arg);
    });
}
