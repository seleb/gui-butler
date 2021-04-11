const { resolve } = require('path');
class Butler {
	constructor() {
		this.process = resolve(__dirname, '../butler/butler');
		this.busy = false;
		this.child = null;
	}
	call(args, async, onData, onError, onClose) {
		if (arguments.length < 2) {
			throw new Error('Butler.call takes at least 2 arguments');
		}

		if (this.busy) {
			alert("butler's already running a process; quit being impatient");
			return;
		}

		// prefer JSON format
		args.push('--json');

		// block future butler calls till this one's done
		this.busy = true;

		this.onClose = onClose;

		try {
			if (async) {
				this.child = child_process.spawn(this.process, args);

				// pass output to handlers
				if (onData) {
					this.child.stdout.on('data', onData);
				}
				if (onError) {
					this.child.stderr.on('data', onError);
				}

				// unblock on child process close
				this.child.on('close', this._onClose.bind(this));
			} else {
				this.child = child_process.spawnSync(this.process, args);

				// pass output to handlers
				if (onData) {
					onData(this.child.stdout);
				}
				if (onError) {
					onError(this.child.stderr);
				}

				// sync command is unblocked immediately
				this._onClose();
			}
		} catch (e) {
			// TODO: something better than this :/
			alert('butler error:\n' + e.toString());

			// unblock on error
			this.busy = false;
		}
	}
	_onClose(code) {
		this.busy = false;
		this.child = null;
		if (this.onClose) {
			this.onClose(code);
		}
	}
	_respond(response) {
		this.child.stdin.write(`${JSON.stringify(response)}\n`);
	}
	yes() {
		this._respond({ response: true });
	}
	no() {
		this._respond({ response: false });
	}
}

module.exports = { Butler };
