import { ipcMain } from 'electron';

const minPackageVersion = '1.0.0';
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
                dialogTitle: '✨ New version available',
                dialogDescription: `
            <p>Hey Dev, there is a new release of Laradumps!</p>
            <div class="m-2">
              <p>Minimum version: <strong>${minPackageVersion}</strong></p>
              <p>Package version: <strong>${arg.content.meta.laradumps_version}</strong></p>
            </div>
            <div class="m-2">
                <span>Consider upgrading your app and package to take advantage of new features, bug fix and major improvements.</span>
                <div class="mt-2 cursor-pointer font-semibold" 
                      x-on:click="openLink('https://github.com/laradumps/laradumps')">https://github.com/laradumps/laradumps</div>
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
