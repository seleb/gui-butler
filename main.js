const { app, BrowserWindow, ipcMain } = require('electron');
function createWindow() {
	win = new BrowserWindow({
		useContentSize: true,
		icon:"favicon.ico",
		title:"gui-butler",
		titleBarStyle: "hiddenInset",
		autoHideMenuBar: true,
		backgroundColor:"#FFFFFF",
		minHeight:300,
		minWidth:400,
		show:false
	});
	win.once('ready-to-show', function(){
		win.show();
	});
	win.loadURL(`file://${__dirname}/index.html`);
}
app.on('ready', createWindow);
