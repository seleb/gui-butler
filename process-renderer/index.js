$(document).ready(async function () {
	$('fieldset').hide();

	app = new window.App();

	////////////////
	// MAIN STUFF //
	////////////////
	$('#channelWin,#channelOsx,#channelLinux,#channelOther').on('change', function (event) {
		app.validate();
	});

	$('#btnLogin').on('click', function (event) {
		app.login($('#key').val(), $('#user').val(), $('#rememberMe')[0].checked);
	});

	$('#btnLogout').on('click', function (event) {
		app.logout();
	});

	$('#userSelect').on('change', function (event) {
		app.selectUser($('#userSelect option:selected').val());
	});

	$('#projectSelect').on('change', function (event) {
		app.selectProject($('#projectSelect option:selected').val());
		app.validate();
	});

	$('#selectedFile').on('change', function (event) {
		app.selectFile(event.currentTarget.files[0]);
	});

	$('#btnPush').on('click', function (event) {
		app.butler_push(app.selectedFile, app.getProjectUrl());
	});

	$('#btnCheckStatus').on('click', function (event) {
		app.butler_status(app.getProjectUrl());
	});

	await app.butler_init();
	app.tryLogin();
});
