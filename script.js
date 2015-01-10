var fs = require("fs");
var url = require("url");
var path = require("path");
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var request = require('request');

var config = require('./config.json');
var sites = require('./sites.json');
var sitesData = fs.existsSync('./sites.data.json') ? require('./sites.data.json') : [];

// запускает механизм проса сайтов
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

// посылает запрос на сайт и обрабатывает
CheckSite = function (item) {
	io.emit('setSiteInProcess', item.Id);
	
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

// запускает повторный опрос сайта через определённое время (надо будет выпилить)
CheckProcess = function(item) {
	sitesData[item.Id].lastStatusDate = new Date();
	io.emit('setSite', { site: item, data: sitesData[item.Id] });
	setTimeout(function() { CheckSite(item); }, config.POLL_INTERVAL);
};
 
// сохраняет данные по доступности сайтов (надо будет выпилить)
DataSave = function() {
	fs.writeFile("./sites.data.json", JSON.stringify(sitesData), "utf8");
};

// записывает сообщение в лог (пока только в консоль)
LogWrite = function(tag, message, isImportant) {
	isImportant = (typeof(isImportant) !== 'undefined') ? isImportant : false;
	if(config.DEBUG || isImportant) {
		var timeStamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
		var importantStamp = (isImportant) ? '[!!]' : '';
		var resultMessage = timeStamp + ' ' + importantStamp + '[' + tag + ']: ' + message;
		console.log(resultMessage);
	}
}

//http server
server.listen(process.env.PORT || config.HTTP_PORT, function() {
	LogWrite('http', 'Listening on port ' + server.address().port);
});
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.get('/', function (req, res) {
	res.render('index', { title: 'Мониториг' });
});
app.get('/about', function (req, res) {
	res.render('about', { title: 'Об этом приложении' });
});
app.use(express.static(__dirname + '/public'));

//socks server
io.on('connection', function(socket){
	LogWrite('socks', 'User connected');
	socket.on('disconnect', function(){
		LogWrite('socks', 'User disconnected');
	});
	socket.on('getSites', function() {
		socket.emit('setSites', { sites: sites, sitesData: sitesData });
	});
});

//start machine!
Main();