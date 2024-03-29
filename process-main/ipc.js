const { ipcMain, dialog, shell } = require('electron');
const Butler = require('./butler-wrapper');
const { getWindow } = require('./window');
const { forgetToken, getToken, rememberToken } = require('./oauth');

async function yesno(json) {
	const { response } = await dialog.showMessageBox(getWindow(), {
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
			.split('\n')
			// filter non-JSON "bailing" messages
			.filter(i => !i.startsWith('bailing out:'))
			// convert to json
			.map(i => {
				try {
					return JSON.parse(i);
				} catch (err) {
					// wharf errors sometimes end up here due to also being multi-line, but they'll get logged by the error popup already
					console.log('Non-JSON message:', i);
					return '';
				}
			}).filter(i => i)
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

ipcMain.handle('oauth:autologin', rememberToken);

ipcMain.handle('oauth:login', async (event, rememberMe) => {
	try {
		let auth = await rememberToken();
		if (!auth) {
			auth = await getToken(rememberMe);
		}
		return auth;
	} catch (err) {
		console.error(auth);
		event.sender.send('butler:error', err);
	}
});

ipcMain.handle('oauth:logout', async () => {
	await forgetToken();
});
