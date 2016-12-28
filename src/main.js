const { app, BrowserWindow, ipcMain } = require('electron');
let win;
function createWindow() {
	win = new BrowserWindow({
		useContentSize: true,
		icon:"favicon.ico",
		title:"gui-butler",
		titleBarStyle: "hidden",
		autoHideMenuBar: true,
		frame:false,
		transparent:true,
		backgroundColor:"#00FFFFFF",
		minHeight:300,
		minWidth:400,
		resizable:true,
		maximizable:true,
		show:false
	});
	win.once('ready-to-show', function(){
		win.show();
	});
	win.loadURL(`file://${__dirname}/index.html`);
}
app.on('ready', createWindow);

//https://itch.io/api/1/KEY/my-games