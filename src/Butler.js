////////////
// BUTLER //
////////////

var Butler = function(){
	this.process = "butler";
	this.busy = false;

	try{
		child_process.execFile(this.process, ["-V"], function(error, stdout, stderr){
			if(error){
				alert("butler error:\n"+error.toString());
			}
			$("#version").html((stdout || stderr).toString());
		});
	}catch(e){
		alert("butler error:\n"+e.toString());
	}
};
Butler.prototype.call = function(args){
	if(this.busy){
		alert("butler's already running a process; quit being impatient");
		return;
	}

	this.busy = true;
		$("#output").text("");

	try{
		var child = child_process.spawn(this.process, args);

		child.stdout.on("data", this.onData.bind(this));
		child.stderr.on("data", this.onError.bind(this));
		child.on("close", this.onClose.bind(this));
	}catch(e){
		alert("butler error:\n"+e.toString());

		this.busy = false;
	}
};

Butler.prototype.push = function(file, url){
	this.call(["push", file, url]);
};
Butler.prototype.status = function(url){
	this.call(["status", url]);
};

Butler.prototype.onData = function(data){
	var s = data.toString();

	s = s.replace(/\n/g, "<br>");
	s = s.replace(/ /g, "&nbsp;");

	s = $("#output").html() + s;

	var a = s.split("\r");
	s = "";
	while(a.length > 1){
		var c = a.shift();
		s += c.substr(0, c.lastIndexOf("<br>")+4);
	}
	s += a.shift();

	/*for(var i = 0; i < data.length; ++i){
		var c = String.fromCodePoint(data[i]);
		console.log(data[i], c);
		if(c == "\n"){
			s += "<br>";
		}if(c == " "){
			s += "&nbsp;";
		}else if(c == "\r"){
			s = s.substring(0, s.lastIndexOf("<br>"))+"<br>";
		}else{
			s += c;
		}
	}*/
	$("#output").html(s);
	$("#output").scrollTop($("#output")[0].scrollHeight);
};
Butler.prototype.onError = function(data){
	this.onData(data);
};
Butler.prototype.onClose = function(code){
	this.busy = false;
};