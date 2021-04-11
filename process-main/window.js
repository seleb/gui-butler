const { BrowserWindow, app, shell } = require('electron');
const path = require('path');

let win;
function createWindow() {
	win = new BrowserWindow({
		useContentSize: true,
		icon: 'favicon.ico',
		title: 'gui-butler',
		titleBarStyle: 'hiddenInset',
		autoHideMenuBar: true,
		backgroundColor: '#FFFFFF',
		minHeight: 300,
		minWidth: 400,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
			preload: path.join(__dirname, 'preload.js'),
		},
	});
	win.once('ready-to-show', function () {
		win.show();
	});
	win.loadURL(`file://${__dirname}/../process-renderer/index.html`);

	// open links externally by default
	win.webContents.on('new-window', function (e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});

	if (!app.isPackaged) {
		win.toggleDevTools();
	}
}

module.exports = {
	createWindow,
	win,
};
