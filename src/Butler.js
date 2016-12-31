////////////
// BUTLER //
////////////

var Butler = function(){
	this.process = "butler";
	this.busy = false;
};


Butler.prototype.call = function(args, async, onData, onError){
	if(arguments.length < 2){
		throw "Error: Butler.call takes at least 2 arguments";
	}

	if(this.busy){
		alert("butler's already running a process; quit being impatient");
		return;
	}

	// prefer JSON format
	args.push("--json");

	// block future butler calls till this one's done
	this.busy = true;

	try{
		if(async){
			var child = child_process.spawn(this.process, args);

			// pass output to handlers
			if(onData){
				child.stdout.on("data", onData);
			}if(onError){
				child.stderr.on("data", onError);
			}

			// unblock on child process close
			child.on("close", this.onClose.bind(this));
		}else{
			var child = child_process.spawnSync(this.process, args);

			// sync command is unblocked immediately
			this.busy = false;

			// pass output to handlers
			if(onData){
				onData(child.stdout);
			}if(onError){
				onError(child.stderr);
			}
		}
	}catch(e){
		// TODO: something better than this :/
		alert("butler error:\n"+e.toString());

		// unblock on error
		this.busy = false;
	}
	
};

Butler.prototype.onClose = function(code){
	this.busy = false;
};