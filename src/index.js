// jquery!
window.$ = window.jQuery = require('jquery');

$(document).ready(function(){

	// get some of the stuff we need for later
	const { remote } = require('electron');
	const { ipcRenderer } = require('electron');
	spawn = module.require("child_process").spawn;


    // open links externally by default
    // since we're using a single-page frameless app, opening them in electron would be pretty weird
	var shell = require('electron').shell;
    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });


    ///////////////////
    // FRAME BUTTONS //
    ///////////////////
	var win = remote.getCurrentWindow();

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


	win.on('maximize', ()=> {
		$("html").addClass("maximized");
	});
	win.on('unmaximize', ()=> {
		$("html").removeClass("maximized");
	});

	$("#key").val(window.localStorage.getItem("key"));
	$("#user").val(window.localStorage.getItem("user"));
	if(window.localStorage.getItem("rememberMe") == "1"){
		$("#rememberMe").prop('checked', true);
	}




	////////////////
	// MAIN STUFF //
	////////////////
	
	$("#login button").on("click", function(event){
		key = $("#key").val();
		user = $("#user").val();
		rememberMe = $("#rememberMe")[0].checked;

		if(rememberMe){
			window.localStorage.setItem("key", key);
			window.localStorage.setItem("user", user);
			window.localStorage.setItem("user", user);
			window.localStorage.setItem("rememberMe", "1");
		}else{
			window.localStorage.setItem("key", "");
			window.localStorage.setItem("user", "");
			window.localStorage.setItem("rememberMe", "0");
		}

		console.log(key);
		console.log(user);

		$.ajax({
			url: "https://itch.io/api/1/"+key+"/my-games"
		}).done(function(data){
			console.log(data);

			if(data.errors){
				// error when submitting API key
				// TODO: fail and notify
			}

			var s="";

			games = data.games;

			if(games.length <= 0){
				// the user has no games associated with their key
				// TODO: fail and notify
			}

			// add the users games to the dropdown
			for(var i = 0; i < games.length; ++i){
				var g = games[i];
				s += "<option value=\"" + i + "\">" + g.title + "</option>";
			}	

			// auto-select the first game in the dropdown
			// (provides a bit of feedback + removes the need for a null entry)
			$("#gameSelect").append(s);
			$("#gameSelect").val("0").change();


			$("#selectGame").show();
		}).fail(function(){
			// couldn't get a response
			// TODO: fail and notify
			console.error("something went wrong!");
		});
	});

	$("#gameSelect").on("change", function(event){
		var idx = $("select option:selected").val();

		selected = games[idx];

		// get rid of the old cover, then set then new one
		$("#gameCover").attr("src","");
		$("#gameCover").attr("src",selected.cover_url);

		// update text
		$("#gameTitle").text(selected.title);
		$("#gameText").text(selected.short_text);

		// update link
		selected.shortUrl = selected.url.split(".itch.io/")[1];
		$("#gameUrl").attr("href",selected.url);

		$("#selectBuild").show();
	});

	$("#btnPush").on("click",function(event){
		// don't actually submit a form
		event.preventDefault();



		var channels = "";

		if($("#channelWin")[0].checked){
			channels += "win-";
		}if($("#channelOsx")[0].checked){
			channels += "osx-";
		}if($("#channelLinux")[0].checked){
			channels += "linux-";
		}

		channels += $("#channelOther").val();

		if(channels.substr(-1) == "-"){
			channels = channels.slice(0,-1);
		}

		selected.channels = channels;

		var file = $("#selectedFile").text();
		var url = user+"/"+selected.shortUrl+":"+selected.channels;

	 	butler.push(file, url);
	});

	$("#btnCheckStatus").on("click",function(event){

		var url = user+"/"+selected.shortUrl+":"+selected.channels;

	 	butler.status(url);
	});

	$("#selectedFile").on("click", function(event){
		remote.dialog.showOpenDialog(
		{
			title: "Select build archive",
			filters: [{name: "Build Archive", extensions:["zip"]}],
			properties: ['openFile']
		},
		function(filenames){
			if(filenames.length==1){
				$("#selectedFile").text(filenames[0]);

				$("#butler").show();
			}else{
				// canceled selection
				$("#butler").hide();
			}
		});
	});


	////////////
	// BUTLER //
	////////////

	var butler={
		process: "butler",
		busy: false,
		call: function(args){
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
		},

		push: function(file, url){
			this.call(["push", file, url, "-v"]);
		},
		status: function(url){
			this.call(["status", url, "-v"]);
		},

		onData: function(data){
			$("#output").append(data.toString());
			$('#output').scrollTop($('#output')[0].scrollHeight);
			$('#output').scrollLeft($('#output')[0].scrollWidth);
		},
		onError: function(data){
			this.onData(data);
		},
		onClose: function(code){
			console.log("child process exited with code "+code);
			this.busy = false;
		}
	};
});