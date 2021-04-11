const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
	invoke(...args) {
		return ipcRenderer.invoke(...args);
	},
	on(channel, handler) {
		ipcRenderer.on(channel, (event, ...args) => {
			handler(...args);
		});
	},
});
