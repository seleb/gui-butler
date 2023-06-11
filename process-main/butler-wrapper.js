const { resolve } = require('path');
const { spawn } = require('child_process');
const EventEmitter = require('events');

const pathButler = resolve(__dirname, '../butler/butler');

class Butler extends EventEmitter {
	constructor() {
		super();
		this.child = null;
	}
	invoke(...args) {
		return new Promise((resolve, reject) => {
			this.child = spawn(pathButler, args);

			const response = [];
			const error = [];

			this.child.stdout.on('data', data => {
				const str = data.toString();
				response.push(str);
				this.emit('data', str);
			});
			this.child.stderr.on('data', data => {
				const str = data.toString();
				error.push(str);
				this.emit('data', str);
			});

			this.child.on('close', () => {
				if (error.length) {
					reject(error.join(''));
					return;
				}
				resolve(response.join(''));
			});
		});
	}
	yesnoRespond(response) {
		return this.child.stdin.write(`${JSON.stringify({ response })}\n`);
	}
}

module.exports = Butler;
