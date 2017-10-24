/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------
//setup maximum eventEmitter as possible;
require('events').EventEmitter.defaultMaxListeners = Infinity;
// This application uses express as its web server
// for more info, see: http://expressjs.com
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

/**
 *	Allow cross domain api-hits
 **/
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://dev-platform.mybluemix.net, https://live-platform.mybluemix.net');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', "Content-Type");
    next();
};
app.use(allowCrossDomain);

/**
 *	Socket-Server Post route which accepts data from "http://dev-todoOffline.mybluemix.net"
 *  app and triger the refresh event on connected user with web-socket from "web-app/mobile-app"
 **/

app.post("/accept_request", function(req, res) {
    var body = req.body;
    process.emit("$accept$event$from$server", body);
    return res.status(200).json({ status: 200, error: false, msg: "Request accepts successfully", record: body });
});

app.post("/notify_connected_users", function(req, res) {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>.", req.body);   
    var body = req.body;
    process.emit("$notify$Connected$Users", body);
    return res.status(200).json({ status: 200, error: false, msg: "Request accepts successfully", record: body });
});

app.post("/added_data_from_operator", function(req, res){
    console.log(">>>>>>>>>>>>>>>>>>>>>>", req.body);
    var body = req.body;
    process.emit("$added$data$from$operator", body);
    return res.status(200).json({status: 200, error: false, msg: "Request accepts successfully", record: body});
});

app.post("/send_push_notification", function(req, res) {
    console.log("send_push Notification body is as follows>>>", JSON.stringify(req.body));
    var helper = require('./helpers'),
        requestify = require('requestify'),
        payload = req.body;

    if (helper.isEmpty(payload)) return res.status(400).json({ status: 400, error: true, msg: "Request payload is empty.", data: payload });
    if (helper.isEmpty(payload.push_url)) return res.status(400).json({ status: 400, error: true, msg: "`push_url` payload field is missing or empty.", data: payload });
    if (helper.isEmpty(payload.appSecrect)) return res.status(400).json({ status: 400, error: true, msg: "`appSecrect` payload field is missing or empty.", data: payload });

    var pushUrl = payload.push_url,
        appSecrect = payload.appSecrect,
        pushBody = payload.payload;

    var options = {
        method: "POST",    
        body: pushBody,
        headers: { appSecret: appSecrect, "Content-Type": "application/json" }
    };

    requestify.request(pushUrl, options)
    .then(function(response) {
        console.log("push notification send successfullyyy >>>>>", response.getBody());
        return res.status(200).json({ status: 200, error: false, msg: "Push notification send successfully", data: response.getBody() });
    }, function(error) {
        console.log("Error logs >>>>>>>>.", error);
        return res.status(400).json({ status: 400, error: true, msg: "Exception raised while sending push notification.", data: error.getBody() });
    });

});

const server = http.createServer(app),
socket = require('socket.io')(server);
require('./socket')(socket);
//appEnv.port = 6050;
server.listen(appEnv.port, '0.0.0.0', function() {
console.log("Server listening at:" + appEnv.url);
});
