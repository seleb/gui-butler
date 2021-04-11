const { app, session } = require('electron');
require('./ipc');

const { createWindow } = require('./window');
app.on('ready', () => {
	// disable all session permissions
	session.defaultSession.setPermissionCheckHandler((_webContents, _permission, callback) => {
		callback(false);
	});
	createWindow();
});
