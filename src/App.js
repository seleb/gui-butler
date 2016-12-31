/////////
// APP //
/////////

var App = function(){
	this.users = null;
	this.selectedUserIdx = null;
	this.selectedUser = null;
	this.projects = null;
	this.selectedProjectIdx = null;
	this.selectedProject = null;
	this.selectedFile = null;
};

App.prototype.login = function(key, user, rememberMe){
	$("#btnLogin").prop("disabled",true);

	$.ajax({
		url: "https://itch.io/api/1/"+key+"/my-games"
	}).done(function(data){

		// error handling
		
		if(data.errors){
			// error when submitting API key
			
			alert(data.errors.toString());
			$("#btnLogin").prop("disabled",false);

			return;
		}

		if(data.games.length <= 0){
			// the user has nothing associated with their key
			
			alert("Error: couldn't find any projects associated with this key. gui-butler can only push builds to existing projects; you need to use itch.io to actually create them.");
			$("#btnLogin").prop("disabled",false);

			return;
		}



		// success!

		if(rememberMe){
			// save login details to local storage
			window.localStorage.setItem("key", key);
			window.localStorage.setItem("rememberMe", "1");
		}else{
			// clear login details from local storage
			window.localStorage.setItem("key", "");
			window.localStorage.setItem("rememberMe", "0");
		}



		// find all usernames associated with key by stripping URLs
		var users={};
		for(var i = 0; i < data.games.length; ++i){
			var username = data.games[i].url.split("https://")[1].split(".itch.io/")[0];
			if(!users[username]){
				users[username] = {
					username: username,
					projects:[]
				}
			}
			users[username].projects.push(data.games[i]);
		}

		// add users to internal list + dropdown
		this.users = [];
		var s="";
		var i = 0;
		for(var u in users){
			this.users.push(users[u]);
			s += "<option value=\"" + (i++) + "\">" + users[u].username + "</option>";
		}
		$("#userSelect").html(s);



		// update section display
		$("section#login").slideUp();
		$("section#logout").slideDown();



		// auto-select the first user in the dropdown
		// (provides a bit of feedback + removes the need for a null entry)
		$("#userSelect").val("0").change();

		$("section#selectUser").slideDown();
	}.bind(this)).fail(function(){
		$("#btnLogin").prop("disabled",false);

		// couldn't get a response
		alert("Error: itch.io failed to respond. Check your internet connection etc.");
	}.bind(this));
};

App.prototype.logout = function(){
	$("section#login").slideDown();

	$("#btnLogin").prop("disabled",false);

	$("#selectedFile").html("no .zip selected&hellip;");

	$("section#logout").slideUp();
	$("section#selectProject").slideUp();
	$("section#selectBuild").slideUp();
	$("section#selectUser").slideUp();
	$("section#butler").slideUp();
};
App.prototype.selectUser = function(idx){
	this.selectedUserIdx = parseInt(idx,10);
	this.selectedUser = this.users[this.selectedUserIdx];

	// update link
	$("#userPreview").attr("href", "https://"+this.selectedUser.username+".itch.io");

	// add the users games to the dropdown
	this.projects = this.selectedUser.projects;
	s="";
	for(var i = 0; i < this.projects.length; ++i){
		var g = this.projects[i];
		s += "<option value=\"" + i + "\">" + g.title + "</option>";
	}
	$("#projectSelect").html(s);

	// auto-select the first game in the dropdown
	// (provides a bit of feedback + removes the need for a null entry)
	$("#projectSelect").val("0").change();

	$("#selectProject").slideDown();
};
App.prototype.selectProject = function(idx){
	this.selectedProjectIdx = parseInt(idx,10);
	this.selectedProject = this.projects[this.selectedProjectIdx];

	// get rid of the old cover, then set then new one
	$("#projectCover").attr("src", "");
	$("#projectCover").attr("src", this.selectedProject.cover_url);

	// update text
	$("#projectTitle").text(this.selectedProject.title);
	$("#projectText").text(this.selectedProject.short_text);

	// update link
	$("#projectUrl").attr("href", this.selectedProject.url);

	$("#selectBuild").slideDown();
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
		if(filenames && filenames.length == 1){
			this.selectedFile = filenames[0];
			$("#selectedFile").text(this.selectedFile);
			$("section#butler").slideDown();

			// if there aren't already any channels set
			// search the filename for "win","osx","linux" and check their boxes
			// also search for "web","32","64" and add them to other
			if(this.getChannels().length == 0){
				// only use the file and not the whole path to reduce false positives
				var fileEnd = this.selectedFile.toLowerCase().split(/[\/\\]+/).pop();
				if(fileEnd.indexOf("win") !== -1){
					$("#channelWin").trigger("click");
				}
				if(fileEnd.indexOf("osx") !== -1){
					$("#channelOsx").trigger("click");
				}
				if(fileEnd.indexOf("linux") !== -1){
					$("#channelLinux").trigger("click");
				}
				if(fileEnd.indexOf("web") !== -1){
					$("#channelOther").val("web-");
				}
				if(fileEnd.indexOf("32") !== -1){
					$("#channelOther").val($("#channelOther").val()+"32-");
				}
				if(fileEnd.indexOf("64") !== -1){
					$("#channelOther").val($("#channelOther").val()+"64-");
				}
				if($("#channelOther").val().substr(-1) == "-"){
					$("#channelOther").val($("#channelOther").val().slice(0,-1));
					$("#channelOther").trigger("change");
				}
			}

		}else if($("#selectedFile").text().length <= 0){
			// canceled selection
			$("section#butler").slideUp();
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
	channels += $("#channelOther").val().toLowerCase();

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
	return this.selectedUser.username+"/"+this.getProjectShortUrl()+":"+this.getChannels();
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