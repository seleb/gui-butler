// jquery!
window.$ = window.jQuery = require("jquery");


/////////
// APP //
/////////
var App = function(){
	this.user = null;
	this.projects = null;
	this.selectedProjectIdx = null;
	this.selectedProject = null;
	this.selectedFile = null;
};

App.prototype.login = function(key, user, rememberMe){
	// TODO: prevent from re-submitting while AJAX is running
	// TODO: clear existing data in next stages (they might change users and invalidate existing project data)

	if(rememberMe){
		// save login details to local storage
		window.localStorage.setItem("key", key);
		window.localStorage.setItem("user", user);
		window.localStorage.setItem("rememberMe", "1");
	}else{
		// clear loging details from local storage
		window.localStorage.setItem("key", "");
		window.localStorage.setItem("user", "");
		window.localStorage.setItem("rememberMe", "0");
	}

	$.ajax({
		url: "https://itch.io/api/1/"+key+"/my-games"
	}).done(function(data){
		console.log(data);

		if(data.errors){
			// error when submitting API key
			// TODO: fail and notify
		}

		this.projects = data.games;

		if(this.projects.length <= 0){
			// the user has no games associated with their key
			// TODO: fail and notify
		}

		// store the user for butler to use later
		this.user = user;

		// add the users games to the dropdown
		var s="";
		for(var i = 0; i < this.projects.length; ++i){
			var g = this.projects[i];
			s += "<option value=\"" + i + "\">" + g.title + "</option>";
		}	

		// auto-select the first game in the dropdown
		// (provides a bit of feedback + removes the need for a null entry)
		$("#gameSelect").append(s);
		$("#gameSelect").val("0").change();


		$("#selectGame").show();
	}.bind(this)).fail(function(){
		// couldn't get a response
		// TODO: fail and notify
		console.error("something went wrong!");
	}.bind(this));
};
App.prototype.selectProject = function(idx){
	this.selectedProjectIdx = parseInt(idx,10);
	this.selectedProject = this.projects[this.selectedProjectIdx];

	// get rid of the old cover, then set then new one
	$("#gameCover").attr("src", "");
	$("#gameCover").attr("src", this.selectedProject.cover_url);

	// update text
	$("#gameTitle").text(this.selectedProject.title);
	$("#gameText").text(this.selectedProject.short_text);

	// update link
	$("#gameUrl").attr("href", this.selectedProject.url);

	$("#selectBuild").show();
};
App.prototype.selectFile = function(){
	// prompt user to select a .zip archive
	remote.dialog.showOpenDialog(
	{
		title: "Select build archive",
		filters: [{name: "Build Archive", extensions:["zip"]}],
		properties: ["openFile"]
	},
	function(filenames){
		if(filenames.length==1){
			this.selectedFile = filenames[0];
			$("#selectedFile").text(this.selectedFile);
			$("section#butler").show();
		}else{
			// canceled selection
			$("section#butler").hide();
		}
	}.bind(this));
};
App.prototype.getChannels = function(){
	var channels = "";

	// add preset channels
	if($("#channelWin")[0].checked){
		channels += "win-";
	}if($("#channelOsx")[0].checked){
		channels += "osx-";
	}if($("#channelLinux")[0].checked){
		channels += "linux-";
	}

	// add custom channels
	channels += $("#channelOther").val();

	// remove the last dash
	if(channels.substr(-1) == "-"){
		channels = channels.slice(0,-1);
	}

	return channels;
};
App.prototype.getProjectShortUrl = function(){
	// the URL for butler is the same as the one for the project's the itch page
	return this.selectedProject.url.split(".itch.io/")[1];
};
App.prototype.getProjectUrl = function(){
	// butler URLs are user/project-url:channels-in-a-dash-separated-list
	return this.user+"/"+this.getProjectShortUrl()+":"+this.getChannels();
};

App.prototype.validate = function(){
	var s=this.getProjectUrl();
	$("#targetPreview").val(s);
	
	if(this.getChannels() <= 0){
		$("#btnPush").prop("disabled",true);
		$("#btnCheckStatus").prop("disabled",true);
	}else{
		$("#btnPush").prop("disabled",false);
		$("#btnCheckStatus").prop("disabled",false);
	}
}

////////////
// BUTLER //
////////////

var Butler = function(){
	this.process = "butler";
	this.busy = false;
};
Butler.prototype.call = function(args){
	if(this.busy){
		alert("butler's already running a process; quit being impatient");
		return;
	}

	this.busy = true;
		$("#output").text("");
	var child = spawn(this.process, args);

	child.stdout.on("data", this.onData.bind(this));
	child.stderr.on("data", this.onError.bind(this));
	child.on("close", this.onClose.bind(this));
};

Butler.prototype.push = function(file, url){
	this.call(["push", file, url, "-v"]);
};
Butler.prototype.status = function(url){
	this.call(["status", url, "-v"]);
};

Butler.prototype.onData = function(data){
	$("#output").append(data.toString());
	$("#output").scrollTop($("#output")[0].scrollHeight);
	$("#output").scrollLeft($("#output")[0].scrollWidth);
};
Butler.prototype.onError = function(data){
	this.onData(data);
};
Butler.prototype.onClose = function(code){
	console.log("child process exited with code "+code);
	this.busy = false;
};


$(document).ready(function(){

	var app = new App();
	var butler = new Butler();

	// get some of the stuff we need for later
	remote = require("electron").remote;
	spawn = require("child_process").spawn;


    // open links externally by default
    // since we're using a single-page frameless app, opening them in electron would be pretty weird
	var shell = require("electron").shell;
    $(document).on("click", "a[href^=\"http\"]", function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });


    ///////////////////
    // FRAME BUTTONS //
    ///////////////////
	var win = remote.getCurrentWindow();

	win.on("maximize", function(){
		$("html").addClass("maximized");
	});
	win.on("unmaximize", function(){
		$("html").removeClass("maximized");
	});

	$("#btnMinimize").on("click",function(event){
		win.minimize();
	});
	$("#btnMaximize").on("click",function(event){
		if(win.isMaximized()){
			win.unmaximize();
		}else{
			win.maximize();
		}
	});
	$("#btnExit").on("click",function(event){
		remote.app.exit();
	});


	////////////////
	// MAIN STUFF //
	////////////////
	$("#channelWin,#channelOsx,#channelLinux,#channelOther").on("change",function(event){
		app.validate();
	});
	
	$("#login button").on("click", function(event){
		app.login(
			$("#key").val(),
			$("#user").val(),
			$("#rememberMe")[0].checked
		);
	});

	// get login details
	$("#key").val(window.localStorage.getItem("key"));
	$("#user").val(window.localStorage.getItem("user"));
	if(window.localStorage.getItem("rememberMe") == "1"){
		$("#rememberMe").prop("checked", true);
		$("#login button").trigger("click");
	}

	$("#gameSelect").on("change", function(event){
		app.selectProject($("select option:selected").val());
		app.validate();
	});

	$("#selectedFile").on("click", function(event){
		app.selectFile();
	});

	$("#btnPush").on("click",function(event){
	 	butler.push(
	 		$("#selectedFile").text(),
	 		app.getProjectUrl()
	 	);
	});

	$("#btnCheckStatus").on("click",function(event){
	 	butler.status(app.getProjectUrl());
	});
});