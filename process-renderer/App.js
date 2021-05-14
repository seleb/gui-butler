function hide(el) {
	el.setAttribute('aria-visible', false);
}
function show(el) {
	el.setAttribute('aria-visible', true);
}

const formatSeconds = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format;

window.App = class App {
	constructor() {
		this.users = null;
		this.selectedUserIdx = null;
		this.selectedUser = null;
		this.projects = null;
		this.selectedProjectIdx = null;
		this.selectedProject = null;
		this.selectedFile = null;

		api.on('butler:log', (...args) => {
			this.onButlerLog(...args);
		});
		api.on('butler:progress', (...args) => {
			this.onButlerProgress(...args);
		});
		api.on('butler:error', (...args) => {
			this.onButlerError(...args);
		});
		this.init();
	}
	async init() {
		document.querySelectorAll('fieldset').forEach(hide);
		show(document.querySelector('#login'));

		document.querySelectorAll('#channelWin,#channelOsx,#channelLinux,#channelOther').forEach(i => {
			i.addEventListener('change', this.validate);
		});
		document.querySelector('#btnLogin').addEventListener('click', this.login);
		document.querySelector('#btnLogout').addEventListener('click', this.logout);
		document.querySelector('#userSelect').addEventListener('change', event => {
			this.selectUser(event.currentTarget.value);
		});
		document.querySelector('#projectSelect').addEventListener('change', event => {
			this.selectProject(event.currentTarget.value);
			this.validate();
		});
		document.querySelector('#selectedFile').addEventListener('change', event => {
			this.selectFile(event.currentTarget.files[0]);
		});
		document.querySelector('#btnPush').addEventListener('click', () => {
			this.butler_push(this.selectedFile, this.getProjectUrl(), document.querySelector('#versionInput').value);
		});
		document.querySelector('#btnCheckStatus').addEventListener('click', () => {
			this.butler_status(this.getProjectUrl());
		});

		await this.butler_init();
		this.tryLogin();
	}
	async tryLogin() {
		const token = await api.invoke('oauth:autologin');
		if (token) {
			this.login();
		}
	}
	login = async () => {
		try {
			document.querySelector('#btnLogin').disabled = true;
			await api.invoke('butler', 'login');
			const auth = await api.invoke('oauth:login', document.querySelector('#rememberMe').checked);

			const response = await fetch(`https://itch.io/api/1/${auth}/my-games`);
			const data = await response.json();
			// error handling

			if (data.errors) {
				// error when submitting API key
				this.failLogin(data.errors.toString());
				return;
			}

			if (!data.games.hasOwnProperty('length') || data.games.length <= 0) {
				// the user has nothing associated with their key
				this.failLogin(
					"Error: couldn't find any projects associated with this account. gui-butler only pushes builds to existing projects; you need to use itch.io or the official app to actually create them."
				);
				return;
			}

			// find all usernames associated with key by stripping URLs
			const users = {};
			for (let i = 0; i < data.games.length; ++i) {
				const username = new URL(data.games[i].url).host.split('.itch.io')[0];
				if (!users[username]) {
					users[username] = {
						username: username,
						projects: [],
					};
				}
				users[username].projects.push(data.games[i]);
			}

			// add users to internal list + dropdown
			this.users = [];
			let s = '';
			let i = 0;
			for (let u in users) {
				this.users.push(users[u]);
				s += '<option value="' + i++ + '"' + (i == 0 ? ' selected ' : '') + '>' + users[u].username + '</option>';
			}
			document.querySelector('#userSelect').innerHTML = s;

			// number of users may have changed since last login
			let selectedUser = parseInt(window.localStorage.getItem('userIdx') || '0', 10);
			if (selectedUser >= this.users.length) {
				selectedUser = 0;
				window.localStorage.setItem('userIdx', selectedUser);
			}

			// update display
			hide(document.querySelector('#login'));
			show(document.querySelector('#logout'));

			// auto-select the first user in the dropdown
			// (provides a bit of feedback + removes the need for a null entry)
			document.querySelector('#userSelect').value = selectedUser;
			this.selectUser(selectedUser);

			show(document.querySelector('#selectUser'));
		} catch (err) {
			console.error(err);
			this.failLogin('Error: itch.io failed to respond.');
		}
	};
	failLogin(error) {
		// display error
		// TODO: something nicer than an alert
		alert(error);

		// make sure the login is visible and interactive
		// so the user can change info and try again
		document.querySelector('#btnLogin').disabled = false;
		show(document.querySelector('#login'));
	}
	logout = async () => {
		document.querySelector('#btnLogout').disabled = true;
		await api.invoke('butler', 'logout');
		await api.invoke('oauth:logout');
		document.querySelector('#btnLogout').disabled = false;
		show(document.querySelector('#login'));

		document.querySelector('#btnLogin').disabled = false;

		document.querySelectorAll('#logout,#selectProject,#selectBuild,#selectUser,#pushBuild').forEach(hide);
	};
	selectUser(idx) {
		this.selectedUserIdx = parseInt(idx, 10);
		this.selectedUser = this.users[this.selectedUserIdx];
		window.localStorage.setItem('userIdx', this.selectedUserIdx);

		// update link
		document.querySelector('#userPreview').href = `https://${this.selectedUser.username}.itch.io`;

		// add the users games to the dropdown
		this.projects = this.selectedUser.projects;
		let s = '';
		for (let i = 0; i < this.projects.length; ++i) {
			const g = this.projects[i];
			s += '<option value="' + i + '"' + (i == 0 ? ' selected ' : '') + '>' + g.title + '</option>';
		}
		document.querySelector('#projectSelect').innerHTML = s;

		// number of projects may have changed since last login
		let projectIdx = parseInt(window.localStorage.getItem('projectIdx') || '0', 10);
		if (projectIdx >= this.projects.length) {
			projectIdx = 0;
			window.localStorage.setItem('projectIdx', projectIdx);
		}

		// auto-select the first game in the dropdown
		// (provides a bit of feedback + removes the need for a null entry)
		document.querySelector('#projectSelect').value = projectIdx;
		this.selectProject(projectIdx);

		show(document.querySelector('#selectProject'));
	}
	selectProject(idx) {
		this.selectedProjectIdx = parseInt(idx, 10);
		this.selectedProject = this.projects[this.selectedProjectIdx];
		window.localStorage.setItem('projectIdx', this.selectedProjectIdx);

		// get rid of the old cover, then set then new one
		document.querySelector('#projectCover').src = '';
		document.querySelector('#projectCover').src = this.selectedProject.cover_url;

		// update text
		document.querySelector('#projectText').textContent = this.selectedProject.short_text;

		// update link
		document.querySelector('#projectUrl').href = this.selectedProject.url;

		show(document.querySelector('#selectBuild'));
	}
	async selectFile(file) {
		if (file) {
			this.selectedFile = file.path;
			show(document.querySelector('#pushBuild'));

			// if there aren't already any channels set
			// search the filename for "win","osx","linux" and check their boxes
			// also search for "web","32","64" and add them to other
			if (this.getChannels().length == 0) {
				// only use the file and not the whole path to reduce false positives
				var fileEnd = this.selectedFile
					.toLowerCase()
					.split(/[\/\\]+/)
					.pop();
				if (fileEnd.indexOf('win') !== -1) {
					document.querySelector('#channelWin').checked = true;
				}
				if (fileEnd.indexOf('osx') !== -1) {
					document.querySelector('#channelOsx').checked = true;
				}
				if (fileEnd.indexOf('linux') !== -1) {
					document.querySelector('#channelLinux').checked = true;
				}
				if (fileEnd.indexOf('web') !== -1) {
					document.querySelector('#channelOther').value += 'web-';
				}
				if (fileEnd.indexOf('32') !== -1) {
					document.querySelector('#channelOther').value += '32-';
				}
				if (fileEnd.indexOf('64') !== -1) {
					document.querySelector('#channelOther').value += '64-';
				}
				this.validate();
			}
		} else {
			// canceled selection
			hide(document.querySelector('#pushBuild'));
		}
	}
	getChannels() {
		let channels = '';

		// add preset channels
		if (document.querySelector('#channelWin').checked) {
			channels += 'win-';
		}
		if (document.querySelector('#channelOsx').checked) {
			channels += 'osx-';
		}
		if (document.querySelector('#channelLinux').checked) {
			channels += 'linux-';
		}

		// add custom channels
		channels += document.querySelector('#channelOther').value.toLowerCase();

		// remove trailing dash
		channels = channels.replace(/-$/, '');

		return channels;
	}
	getProjectShortUrl() {
		// the URL for butler is the same as the one for the project's the itch page
		return this.selectedProject.url.split('.itch.io/')[1];
	}
	getProjectUrl() {
		// butler URLs are user/project-url:channels-in-a-dash-separated-list
		return `${this.selectedUser.username}/${this.getProjectShortUrl()}:${this.getChannels()}`;
	}
	validate = () => {
		document.querySelector('#targetPreview').value = this.getProjectUrl();

		if (this.getChannels().length <= 0) {
			document.querySelector('#btnPush').disabled = true;
			document.querySelector('#btnCheckStatus').disabled = true;
		} else {
			document.querySelector('#btnPush').disabled = false;
			document.querySelector('#btnCheckStatus').disabled = false;
		}
	};
	// calling butler
	async butler_init() {
		await api.invoke('butler', 'upgrade');
		const version = await api.invoke('butler', 'version');
		document.querySelector('#version').textContent = version.value.version;
	}
	async butler_push(file, url, version) {
		document.querySelector('#btnPush').disabled = true;
		show(document.querySelector('#progress'));
		document.querySelector('#progress').scrollIntoView();
		try {
			if (version) {
				await api.invoke('butler', 'push', file, url, `--userversion=${version}`);
			} else {
				await api.invoke('butler', 'push', file, url);
			}
		} finally {
			hide(document.querySelector('#progress'));
			document.querySelector('#btnPush').disabled = false;
		}
	}
	async butler_status(url) {
		document.querySelector('#btnCheckStatus').disabled = true;
		try {
			await api.invoke('butler', 'status', url);
		} finally {
			document.querySelector('#btnCheckStatus').disabled = false;
		}
	}
	onButlerLog(message) {
		// general purpose logging
		// TODO: provide a way to show debug logs in addition to info
		if (message.level == 'info') {
			document.querySelector('#output').append(message.message + '\n');
			document.querySelector('#output').scrollTop = document.querySelector('#output').scrollHeight;
		}
	}
	onButlerProgress(message) {
		// update on upload progress
		document.querySelector('progress').value = message.progress;
		document.querySelector('#eta').value = formatSeconds(message.eta);
	}
	onButlerError(message) {
		console.error(message);
		alert(message.message);
	}
};
