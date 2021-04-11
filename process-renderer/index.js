// jquery!
window.$ = window.jQuery = require("jquery");



$(document).ready(function(){

	// get some of the stuff we need for later
	// TODO: remove use of remote
	remote = require("@electron/remote");
	child_process = require("child_process");

	app = new App();


    // open links externally by default
    // since we're using a single-page frameless app, opening them in electron would be pretty weird
	shell = require("electron").shell;
    $(document).on("click", "a[href^=\"http\"]", function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });


	////////////////
	// MAIN STUFF //
	////////////////
	$("#channelWin,#channelOsx,#channelLinux,#channelOther").on("change",function(event){
		app.validate();
	});
	
	$("#btnLogin").on("click", function(event){
		app.login(
			$("#key").val(),
			$("#user").val(),
			$("#rememberMe")[0].checked
		);
	});
	
	$("#btnLogout").on("click", function(event){
		app.logout();
	});

	$("#userSelect").on("change", function(event){
		app.selectUser($("#userSelect option:selected").val());
	});

	$("#projectSelect").on("change", function(event){
		app.selectProject($("#projectSelect option:selected").val());
		app.validate();
	});

	$("#selectedFile").on("click", function(event){
		app.selectFile();
	});

	$("#btnPush").on("click",function(event){
	 	app.butler_push(
	 		$("#selectedFile").text(),
	 		app.getProjectUrl()
	 	);
		$("#progressBar").addClass("active");
	});

	$("#btnCheckStatus").on("click",function(event){
	 	app.butler_status(app.getProjectUrl());
	});

});
