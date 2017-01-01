var os = require('os');
var getmac = require('getmac');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();
const port = 10854;

app
.use(bodyParser.urlencoded({extended: true}))
.use(bodyParser.json())
.listen(port, () => {
	console.log(`ICU client running on ${port}`);
	console.log('Please make sure the port forwarding problems.');
});

app.get('/status', (req, res) => {
	getMac().then((mac) => {
		getCpuUsage().then((cpuusage) => {
			var result = {
				name: os.hostname,
				uptime: getUptime(),
				cpu_platform: os.arch(),
				cpu_model: os.cpus()[0].model,
				cpu_cores: os.cpus().length,
				cpu_usage: cpuusage,
				freemem: os.freemem(),
				load: getLoadavg(),
				os: os.platform(),
				mac: mac
			};
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify(result));
			res.end();
		});
	}).catch((err) => {
		res.writeHead(400, {'Content-Type': 'application/json'});
		var result = {
			result: -1,
			desc: 'Unexpected Error: '+ err
		};
		res.write(JSON.stringify(result));
		res.end();
	});
});

var last_message = {
	time: 0,
	type_outline: ''
};
setInterval(() => {
	let freemem = os.freemem();
	if(freemem < 100*1024*1024){
		var data = {
			type: 'INFO',
			type_outline: 'Freemem',
			body: 'Freemem is less than 10MB.'
		};
		if(last_message.type_outline != data.type_outline || (last_message.type_outline === data.type_outline && new Date() - last_message.time < 5*60)){
			request.post('http://toy.noob.tw/message', {
				form: data
			});
		}
		last_message.time = new Date() / 1000 | 0;
		last_message.body = data.body;
	}
}, 5000);

function getUptime(){
	// var uptime = Math.floor(os.uptime());
	// var uptimeD = Math.floor(uptime / 86400);
	// var uptimeH = Math.floor(uptime % 86400 / 3600);
	// var uptimeM = Math.floor(uptime % 3600 / 60);
	// var uptimeS = uptime % 60;
	// var uptimeString = '';
	// uptimeString += uptimeD !== 0 ? uptimeD + '天' : '';
	// uptimeString += uptimeH !== 0 ? uptimeH + '時' : '';
	// uptimeString += uptimeM !== 0 ? uptimeM + '分' : '';
	// uptimeString += uptimeS + '秒';
	// return uptimeString;
	return Math.floor(os.uptime());
}

function getLoadavg(){
	var loadavg = os.loadavg();
	loadavg[0] = loadavg[0].toFixed(2);
	loadavg[1] = loadavg[1].toFixed(2);
	loadavg[2] = loadavg[2].toFixed(2);
	return loadavg;
}

// function getFreemem(){
// 	var freemem = os.freemem();
// 	if(freemem > 1073741824){
// 		freemem = (freemem/1073741824).toFixed(1) + ' GB';
// 	}else if(freemem > 1048576){
// 		freemem = Math.floor(freemem/1048576) + ' MB';
// 	}else if(freemem > 1024){
// 		freemem = Math.floor(freemem/1024) + ' KB';
// 	}else{
// 		freemem = freemem + ' Bytes';
// 	}
// 	return freemem;
// }

function getMac(){
	return new Promise((resolve, reject) => {
		getmac.getMac((err, a) => {
			if(!err){
				resolve(a);
			}else{
				reject(err);
			}
		});
	});
}

function getCpuUsage(){
	return new Promise((resolve) => {
		function cpuAverage() {
			var totalIdle = 0, totalTick = 0;
			var cpus = os.cpus();

			for(var i = 0, len = cpus.length; i < len; i++) {

				var cpu = cpus[i];

				for(let type in cpu.times) {
					totalTick += cpu.times[type];
				}
				totalIdle += cpu.times.idle;
			}

			return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
		}

		var startMeasure = cpuAverage();

		setTimeout(function() {

			var endMeasure = cpuAverage();

			var idleDifference = endMeasure.idle - startMeasure.idle;
			var totalDifference = endMeasure.total - startMeasure.total;

			var percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);

			resolve(percentageCPU);

		}, 100);
	});
}

