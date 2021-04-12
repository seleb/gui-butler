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
		show: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	});
	win.once('ready-to-show', function () {
		win.show();
	});
	win.loadURL(`file://${__dirname}/../process-renderer/index.html`);

	// open links externally by default
	win.webContents.on('will-navigate', function (e, url) {
		if (url != win.webContents.getURL()) {
			e.preventDefault();
			shell.openExternal(url);
		}
	});
	if (!app.isPackaged) {
		win.toggleDevTools();
	}
}

module.exports = {
	createWindow,
	getWindow() {
		return win;
	},
	showWindow() {
		return win.show();
	},
};
