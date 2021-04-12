const { shell, app } = require('electron');
const crypto = require('crypto');
const { showWindow } = require('./window');

const Store = require('electron-store');
const store = new Store({
	// TODO: use a real encryption key
	// (not a major concern atm since this only provides access to public info)
	encryptionKey: 'security-through-obfuscation',
	clearInvalidConfig: true,
	schema: {
		'gui-butler-token': {
			type: 'string',
		},
	},
});

const clientId = '9f49ea00c762e32bfe9e2a9ed6168707';
const redirectUri = 'gui-butler://oauth';

module.exports = {
	rememberToken() {
		return store.get('gui-butler-token');
	},
	async getToken(rememberMe) {
		return new Promise((resolve, reject) => {
			const nonce = crypto.randomBytes(16).toString('hex');
			app.once('second-instance', (_event, args) => {
				showWindow();
				const authCmd = args.find(arg => arg.startsWith(redirectUri));
				if (!authCmd) {
					reject(new Error('oauth failed: could not find custom protocol in second-instance'));
				}
				const params = new URLSearchParams(authCmd.split('#').pop());
				if (params.get('state') === nonce) {
					const token = params.get('access_token');
					resolve(token);
					if (rememberMe) {
						store.set('gui-butler-token', token);
					}
				} else {
					reject(new Error('oauth failed: nonce did not match'));
				}
			});
			shell.openExternal(`https://itch.io/user/oauth?client_id=${clientId}&scope=profile%3Agames&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`);
		});
	},
	forgetToken() {
		return store.delete('gui-butler-token');
	},
};
