const { app, session } = require('electron');
const path = require('path');
require('./ipc');

const { createWindow } = require('./window');
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) {
	app.requestSingleInstanceLock();
	return;
}

app.on('ready', () => {
	// disable all session permissions
	session.defaultSession.setPermissionCheckHandler((_webContents, _permission, callback) => {
		callback(false);
	});
	app.removeAsDefaultProtocolClient('gui-butler');
	if (!app.isPackaged) {
		app.setAsDefaultProtocolClient('gui-butler', process.execPath, [path.resolve(process.argv[1])]);
	} else {
		app.setAsDefaultProtocolClient('gui-butler');
	}

	createWindow();
});
