var request = require("request");
var mqtt = require("mqtt");
var fs = require("fs");
var http = require("http");
var CERT = __dirname + '/relayr.crt';

var relayr = module.exports = {};

var listeners = [];

relayr.connect = function(options){


    var goCertificate = function () {
        getAccessTokens(options,function(err,data){

            if (err) {
                console.log(err);
            } else {
                connect(data);
            }
            

        });
    }

    fs.exists(CERT, function(exists){
    
        if (!exists) {
            var file = fs.createWriteStream(CERT);
            var request = http.get("http://mqtt.relayr.io/relayr.crt", function(response) {
              response.pipe(file);
              response.on('close', function () {
                goCertificate();
              });
            });
        } else {
            goCertificate();
        }
    });
};

relayr.listen = function(listener){
	listeners.push(listener);
};

var getAccessTokens = function(relayrkeys,callback){

	var dev_id = relayrkeys.dev_id;
	var token = relayrkeys.token;

	var options = {
		url:"https://api.relayr.io/channels",
		headers: {'Authorization': 'Bearer ' + token},
        json: true,
        body : {
            "deviceId":dev_id,
            "transport": "mqtt"
        }
	}

	console.log("Retrieving Access Tokens");

	request.post(options,function(err,data, body){
		callback(err,body);
	});

};

var handleData = function (err, message) {
    listeners.forEach(function(listener){
        listener(err, message);
    });
}
var connect = function(channelInfo) {
    var credentials = channelInfo.credentials;
        console.log('connecting');
	var client = mqtt.connect({
        servers:[{'host':'mqtt.relayr.io','port':8883}],
        username: credentials.user,
        password: credentials.password,
        clientId: credentials.clientId,
        protocol : 'mqtts',
        certPath: CERT,
        rejectUnauthorized : false, 
    });

    client.on('connect', function () {
        console.log('connected');
        client.subscribe(credentials.topic, function (err, granted) {
            if (err) {
                console.log(err);
            } else {
                //console.log(granted);
            }
        });
    });

    client.on('error', function (error) {
        console.log("connection error");
        console.log(error);
    });

    client.on('message', function(topic, message, packet) {
        var err;
        try {
            message = JSON.parse(new Buffer(message).toString("ascii"));
        } catch (ex) {
            err = ex;
        }
        handleData(err, message);
    })

};