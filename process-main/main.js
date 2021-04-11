const { app } = require('electron');
require('./ipc');
const { createWindow } = require('./window');
app.on('ready', createWindow);
