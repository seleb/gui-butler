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
	}
	async tryLogin() {
		const token = await api.invoke('oauth:autologin');
		if (token) {
			this.login();
		}
	}
	async login() {
		$('#btnLogin').prop('disabled', true);
		await api.invoke('butler', 'login');
		const auth = await api.invoke('oauth:login', $('#rememberMe').prop('checked'));

		$.ajax({
			url: 'https://itch.io/api/1/' + auth + '/my-games',
		})
			.done(
				function (data) {
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
					var users = {};
					for (var i = 0; i < data.games.length; ++i) {
						var username = data.games[i].url.split('https://')[1].split('.itch.io/')[0];
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
					var s = '';
					var i = 0;
					for (var u in users) {
						this.users.push(users[u]);
						s += '<option value="' + i++ + '"' + (i == 0 ? ' selected ' : '') + '>' + users[u].username + '</option>';
					}
					$('#userSelect').html(s);

					// number of users may have changed since last login
					if (parseInt(window.localStorage.getItem('userIdx') || '0', 10) >= this.users.length) {
						window.localStorage.setItem('userIdx', '0');
					}

					// update display
					$('#login').hide();
					$('#logout').show();

					// auto-select the first user in the dropdown
					// (provides a bit of feedback + removes the need for a null entry)
					$('#userSelect')
						.val(window.localStorage.getItem('userIdx') || '0')
						.change();

					$('#selectUser').show();
				}.bind(this)
			)
			.fail(
				function () {
					this.failLogin('Error: itch.io failed to respond. Make sure your web API key has been entered correctly.\nAlso check your internet connection etc.');
				}.bind(this)
			);
	}
	failLogin(error) {
		// display error
		// TODO: something nicer than an alert
		alert(error);

		// make sure the login is visible and interactive
		// so the user can change info and try again
		$('#btnLogin').prop('disabled', false);
		$('#login').show();
	}
	async logout() {
		$('#btnLogout').prop('disabled', true);
		await api.invoke('butler', 'logout');
		await api.invoke('oauth:logout');
		$('#btnLogout').prop('disabled', false);
		$('#login').show();

		$('#btnLogin').prop('disabled', false);

		$('#logout').hide();
		$('#selectProject').hide();
		$('#selectBuild').hide();
		$('#selectUser').hide();
		$('#pushBuild').hide();
	}
	selectUser(idx) {
		this.selectedUserIdx = parseInt(idx, 10);
		this.selectedUser = this.users[this.selectedUserIdx];

		// update link
		$('#userPreview').attr('href', 'https://' + this.selectedUser.username + '.itch.io');

		// add the users games to the dropdown
		this.projects = this.selectedUser.projects;
		var s = '';
		for (var i = 0; i < this.projects.length; ++i) {
			var g = this.projects[i];
			s += '<option value="' + i + '"' + (i == 0 ? ' selected ' : '') + '>' + g.title + '</option>';
		}
		$('#projectSelect').html(s);

		// number of projects may have changed since last login
		if (parseInt(window.localStorage.getItem('projectIdx') || '0', 10) >= this.projects.length) {
			window.localStorage.setItem('projectIdx', '0');
		}

		// save selection to localStorage
		if ((window.localStorage.getItem('rememberMe') || '0') == '1') {
			window.localStorage.setItem('userIdx', idx);
		}

		// auto-select the first game in the dropdown
		// (provides a bit of feedback + removes the need for a null entry)
		$('#projectSelect')
			.val(window.localStorage.getItem('projectIdx') || '0')
			.change();

		$('#selectProject').show();
	}
	selectProject(idx) {
		this.selectedProjectIdx = parseInt(idx, 10);
		this.selectedProject = this.projects[this.selectedProjectIdx];

		// get rid of the old cover, then set then new one
		$('#projectCover').attr('src', '');
		$('#projectCover').attr('src', this.selectedProject.cover_url);

		// update text
		$('#projectText').text(this.selectedProject.short_text);

		// update link
		$('#projectUrl').attr('href', this.selectedProject.url);

		// save selection to localStorage
		if (window.localStorage.getItem('rememberMe') || '0' == '1') {
			window.localStorage.setItem('projectIdx', idx);
		}

		$('#selectBuild').show();
	}
	async selectFile(file) {
		if (file) {
			this.selectedFile = file.path;
			$('#pushBuild').show();

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
					$('#channelWin').trigger('click');
				}
				if (fileEnd.indexOf('osx') !== -1) {
					$('#channelOsx').trigger('click');
				}
				if (fileEnd.indexOf('linux') !== -1) {
					$('#channelLinux').trigger('click');
				}
				if (fileEnd.indexOf('web') !== -1) {
					$('#channelOther').val('web-');
				}
				if (fileEnd.indexOf('32') !== -1) {
					$('#channelOther').val($('#channelOther').val() + '32-');
				}
				if (fileEnd.indexOf('64') !== -1) {
					$('#channelOther').val($('#channelOther').val() + '64-');
				}
				if ($('#channelOther').val().substr(-1) == '-') {
					$('#channelOther').val($('#channelOther').val().slice(0, -1));
					$('#channelOther').trigger('change');
				}
			}
		} else {
			// canceled selection
			$('#pushBuild').hide();
		}
	}
	getChannels() {
		var channels = '';

		// add preset channels
		if ($('#channelWin')[0].checked) {
			channels += 'win-';
		}
		if ($('#channelOsx')[0].checked) {
			channels += 'osx-';
		}
		if ($('#channelLinux')[0].checked) {
			channels += 'linux-';
		}

		// add custom channels
		channels += $('#channelOther').val().toLowerCase();

		// remove the last dash
		if (channels.substr(-1) == '-') {
			channels = channels.slice(0, -1);
		}

		return channels;
	}
	getProjectShortUrl() {
		// the URL for butler is the same as the one for the project's the itch page
		return this.selectedProject.url.split('.itch.io/')[1];
	}
	getProjectUrl() {
		// butler URLs are user/project-url:channels-in-a-dash-separated-list
		return this.selectedUser.username + '/' + this.getProjectShortUrl() + ':' + this.getChannels();
	}
	validate() {
		var s = this.getProjectUrl();
		$('#targetPreview').val(s);

		if (this.getChannels() <= 0) {
			$('#btnPush').prop('disabled', true);
			$('#btnCheckStatus').prop('disabled', true);
		} else {
			$('#btnPush').prop('disabled', false);
			$('#btnCheckStatus').prop('disabled', false);
		}
	}
	// calling butler
	async butler_init() {
		await api.invoke('butler', 'upgrade');
		const version = await api.invoke('butler', 'version');
		$('#version').html(version.value.version);
	}
	async butler_push(file, url) {
		$('#progress').show();
		await api.invoke('butler', 'push', file, url);
		$('#progress').hide();
	}
	async butler_status(url) {
		await api.invoke('butler', 'status', url);
	}
	// receiving messages from butler
	async onMessage(data) {
		await this['json_' + data.type](data);
	}
	onButlerLog(message) {
		// general purpose logging
		// TODO: provide a way to show debug logs in addition to info
		if (message.level == 'info') {
			$('#output').append(message.message + '\n');
			$('#output').scrollTop($('#output')[0].scrollHeight);
		}
	}
	onButlerProgress(message) {
		// update on upload progress
		$('progress').val(message.progress);
		$('#eta').val(formatSeconds(message.eta));
	}
	onButlerError(message) {
		console.error(message);
		alert(message.message);
	}
};
