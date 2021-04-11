const { BrowserWindow, app } = require('electron');

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
		},
	});
	win.once('ready-to-show', function () {
		win.show();
	});
	win.loadURL(`file://${__dirname}/../process-renderer/index.html`);

	if (!app.isPackaged) {
		win.toggleDevTools();
	}
}

module.exports = {
	createWindow,
	win,
};
