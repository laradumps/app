import { BrowserWindow } from 'electron';
import { join, resolve } from 'path';
import { format } from 'url';

const isDev = process.env.NODE_ENV === 'development';

function createCoffeeWindow() {

    const coffeeWindowOptions = {
        width: 700,
        height: 500,
        center: true,
        resizable: false,
        frame: false,
        transparent: false,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    };

    if ((process.platform === 'linux' && !isDev) || isDev) {
        coffeeWindowOptions.icon = resolve(__dirname, 'icon.png');
    }

    const coffeeWindow = new BrowserWindow(coffeeWindowOptions);

    coffeeWindow.setMenu(null);

    if (isDev) {
        coffeeWindow.loadURL('http://localhost:4999/coffee.html');
        coffeeWindow.webContents.openDevTools();
    } else {
        coffeeWindow.loadURL(
            format({
                pathname: join(__dirname, 'app', 'coffee.html'),
                protocol: 'file:',
                slashes: true,
            }),
        );
    }

    return coffeeWindow;
}

export { createCoffeeWindow };
