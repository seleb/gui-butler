const { ipcMain, dialog, shell } = require('electron');
const Butler = require('./butler');
const { win } = require('./window');
const { readFile } = require('fs').promises;

async function yesno(json) {
	const { response } = await dialog.showMessageBox(win, {
		type: 'question',
		buttons: ['Yes', 'No'],
		title: 'butler has a question:',
		message: json.question,
	});

	return response === 0;
}

function parseMessages(string) {
	return (
		string
			.trim()
			// fix status messages not being json
			.replace(/([+|].*[+|])/gm, JSON.stringify({ level: 'info', message: '$1', type: 'log' }))
			// convert to json
			.split('\n')
			.map(JSON.parse)
	);
}

ipcMain.handle('butler', async (event, ...args) => {
	args.push('--json');
	const butler = new Butler();
	butler.addListener('data', async data => {
		const messages = parseMessages(data);
		await messages.reduce(async (_, message) => {
			switch (message.type) {
				case 'log':
					event.sender.send('butler:log', message);
					break;
				case 'error':
					event.sender.send('butler:error', message);
					break;
				case 'result':
					// N/A
					break;
				case 'yesno':
					butler.yesnoRespond(await yesno(message));
					break;
				case 'login':
					shell.openExternal(message.uri);
					break;
				case 'progress':
					event.sender.send('butler:progress', message);
					break;
				default:
					console.log('unsupported type', message);
					throw new Error('unsupported type');
			}
		}, Promise.resolve());
	});
	const data = await butler.invoke(...args);
	butler.removeAllListeners();
	return parseMessages(data.toString()).pop();
});

ipcMain.handle('open-dialog', async (_, options) => {
	return dialog.showOpenDialog(options);
});
