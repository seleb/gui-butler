const { shell, app } = require('electron');
const crypto = require("crypto");
const { showWindow } = require('./window');

const clientId = '9f49ea00c762e32bfe9e2a9ed6168707';
const redirectUri = 'gui-butler://oauth';

module.exports = function () {
	return new Promise((resolve, reject) => {
		const nonce = crypto.randomBytes(16).toString("hex");
		app.once('second-instance', (_event, args) => {
			showWindow();
			const params = new URLSearchParams(args[3].split('#').pop());
			if (params.get('state') === nonce) {
				resolve(params.get('access_token'));
			} else {
				reject(new Error('oauth failed: nonce did not match'));
			}
		});
		shell.openExternal(`https://itch.io/user/oauth?client_id=${clientId}&scope=profile%3Agames&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`);
	});
};
