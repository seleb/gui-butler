const { app, session } = require('electron');
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
	createWindow();
});
