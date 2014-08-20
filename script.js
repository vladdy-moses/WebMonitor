var fs = require("fs");
var url = require("url");
var path = require("path");
var nodeStatic = require('node-static');
var request = require('request');

var config = require('./config.json');
var sites = require('./sites.json');
var sitesData = fs.existsSync('./sites.data.json') ? require('./sites.data.json') : [];

Main = function () {
	var i = 0;
	sites.forEach(function(item) { 
		++i;
		item.Id = i;
		if(typeof(sitesData[i]) === 'undefined')
			sitesData[i] = {};
		setTimeout(function() { CheckSite(item); }, i * config.START_INTERVAL);
	});	
	setInterval(DataSave, config.SAVE_INTERVAL);
};

CheckSite = function (item) {
	request(item.Uri, function (error, response, body) {
		if (!error) {
			sitesData[item.Id].lastStatus = response.statusCode == 200;
			sitesData[item.Id].lastStatusText = 'Status code: ' + response.statusCode;
		} else {
			sitesData[item.Id].lastStatus = false;
			sitesData[item.Id].lastStatusText = 'Error: ' + error.code;
		}
		CheckProcess(item);
	});
};

CheckProcess = function(item) {
	sitesData[item.Id].lastStatusDate = new Date();
	io.emit('setSite', { site: item, data: sitesData[item.Id] });
	setTimeout(function() { CheckSite(item); }, config.POLL_INTERVAL);
};

DataSave = function() {
	fs.writeFile("./sites.data.json", JSON.stringify(sitesData), "utf8");
};

//http server
var fileServer = new nodeStatic.Server('./public');
var server = require('http').createServer(function(request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response);
	}).resume();
});
server.listen(process.env.PORT || config.HTTP_PORT);

//socks server
var io = require('socket.io')(server);
io.on('connection', function(socket){
	console.log('[socks] user connected');
	socket.on('disconnect', function(){
		console.log('[socks] user disconnected');
	});
	socket.on('getSites', function() {
		socket.emit('setSites', { sites: sites, sitesData: sitesData });
	});
});

//start machine!
Main();