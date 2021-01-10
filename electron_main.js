const static = require('node-static');
const file = new static.Server('dist/');

const port = require('http')
    .createServer(function(request, response) {
        request
            .addListener('end', function() {
                file.serve(request, response);
            })
            .resume();
    })
    .listen(8081)
    .address().port;

const { app, BrowserWindow, Menu } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720
    });
    const contents = win.webContents;
    const prompt = require('electron-prompt');
    win.setMenu(
        Menu.buildFromTemplate([
            {
                label: 'Menu',
                submenu: [
                    {
                        label: 'Read URL',
                        click() {
                            prompt({
                                title: 'Input URL',
                                label: 'URL:',
                                value: '',
                                inputAttrs: {
                                    type: 'url'
                                },
                                type: 'input',
                                width: 640,
                                height: 150
                            }).then(res => {
                                if (res === null) {
                                    return console.log('user cancelled');
                                }
                                const url = new URL(res);
                                contents.executeJavaScript(`location.search = "${url.search}"`);
                            });
                        }
                    },
                    {
                        label: 'Exit',
                        click() {
                            app.quit();
                        }
                    }
                ]
            }
        ])
    );
    win.loadURL(`http://localhost:${port}/index.html`);
    win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});