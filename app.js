var request = require('request');
var fs = require('fs');
var winston = require('winston');
var myArgs = require('optimist').argv,
    help = 'This would be a great place for real help information.';


// handle command line args
if ((myArgs.h)||(myArgs.help)) {
    console.log(help);
    process.exit(0);
}
var logPath = __dirname + "/logs/";
if (myArgs.logPath) {
    logPath = myArgs.logPath; // accept passed log path
}
// create the log directory if it doesn't exist
if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}
var logLevel = "info";
if (myArgs.logLevel) {
    logLevel = myArgs.logLevel; // accept passed log level
}

// set up logger
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            "timestamp":true,
            "colorize": true,
            "level": logLevel // default: INFO
        }),
        new (winston.transports.File)({
            filename: logPath + "/fetcher.log",
            "level": logLevel,
            json : false // makes the log readable
        })
    ]
});

logger.debug("logPath = " + logPath);
var endpoint = "http://localhost";
var port = ":3000";

// list of tokens that correlate to the userIDList array
var tokenList  = [
    "u1r_4oEFjcERitMMWaygT0HZjwblB7qMPAxB0JJSceafi4xZAqlZmNJuJ6MD-KTmnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP", // bhav token
    'u1r_4oEFjcGXMeBUkvDdikHZjwblB7qMPAxB0JJSceafi4xZAqlZmKvq7UPSdXGUnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP' // dan token
];

// list of userIDs
var userIdList = [
    "BRx5p_mMpSn-RjknXdn3dA", // bhav userID
    "BRx5p_mMpSnKSKC3Fz2aqw" // dan userID
];

// endpoints to be called every hour
var pathList_1h = [
    "/sleeps/updateSleeps",
    "/moves/updateMoves",
    "/workouts/updateWorkouts",
    "/telegram/sleeps/askAboutSleep",
    "/telegram/moves/askAboutDay",
    "/telegram/workouts/askAboutWorkout",
    "/weather/updateWorkoutWeather"
];

// endpoints to be called every 24 hours
var pathList_24h = [
    "/body/updateBodyEvents",
    "/settings/updateSettings",
    "/stats/heartrate/updateStats",
    "/stats/moves/updateStats",
    "/stats/sleeps/updateStats",
    "/stats/workouts/updateStats",
    "/stats/mood/updateStats"
];

// endpoints to be called every 4 hours
var pathList_4h = [
    "/heartrate/updateHeartRates"
];


// create model for JSON returned from request
var json_res = {
    Jawbone: {
        message : "",
        error : false
    },
    DynamoDB: {
        message : "",
        error : false
    },
    Telegram: {
        message : "",
        error : false
    },
    OpenWeather: {
        message : "",
        error : false
    }
};

// function to send a POST request to the rest_app to update the DB
function postRequest(endpoint, port, path, jsonData,callback) {
    var success = true;
    request.post(
        endpoint + port + path,
        jsonData,
        function optionalCallback(err, httpResponse, body) {
            if (err) {
                logger.error('request failed with :', err.toString());
                return callback(false);
            }
            if (httpResponse.statusCode !== 200) {
                logger.error('request failed with :' + httpResponse.statusCode.toString(), body);
                success = false;
            } else {
                logger.debug('Successful!  Server responded with: \n', JSON.stringify(body, null, 2));
                json_res = JSON.parse(JSON.stringify(body, null, 2));
                if (!json_res.Jawbone.error && !json_res.DynamoDB.error){
                    logger.debug("OK: postRequest(" + path + ")\n");
                } else {
                    logger.warn("FAIL: postRequest(" + path + ")\n");
                    logger.warn(JSON.stringify(body, null, 2));
                    success = false;
                }

                return callback(success);
            }
        });

}


// function to call POST requests for each Jawbone activity
function sendRequests(token, userId, pathList, callback) {
    var json = {json: {token: token, userId: userId, limit: 2}};
    var i = 0;
    var successCount = 0;

    // callback function, executed once the previous post request has completed
    var nextRequest = function (success) {
        // increment a success counter to check if all requests were successful
        if (success) {successCount++;}

        // proceed onto next request, or end
        i++;

        if (i < pathList.length) {
            postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
        } else {
            // check all requests returned ok, and return status
            var allSuccessful = true;
            if (successCount !== pathList.length) { allSuccessful = false; }
            return callback(allSuccessful, pathList);
        }
    };

    // first post request, which triggers the rest via the callback
    postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
}


// loop through each user (token) and update DB
var i = 0;
var nextUser = function(allSuccessful, pathList) {
    // check that all of the requests returned successfully
    if (allSuccessful) {
        logger.info("SUCCESS! - (" + pathList.toString() + ") (token: " + tokenList[i].substr(0,15) + "***********)");
    } else {
        logger.info("1+ REQUESTS FAILED. See above");
    }

    i++;
    if (i < tokenList.length) {
        sendRequests(tokenList[i], userIdList[i], pathList, nextUser);
    } else {
        i = 0; // reset i so that it will start again on next interval
    }
};

// send requests for the given endpoints every 24 hours
function sendRequests24() {
    sendRequests(tokenList[0], userIdList[0], pathList_24h, nextUser);
    setTimeout(sendRequests24, 86400000);
}

// send requests for the given endpoints every 4 hours
function sendRequests4() {
    sendRequests(tokenList[0], userIdList[0], pathList_4h, nextUser);
    setTimeout(sendRequests4, 14400000);
}

// send requests for the given endpoints every hour
function sendRequests1() {
    sendRequests(tokenList[0], userIdList[0], pathList_1h, nextUser);
    setTimeout(sendRequests1, 3600000);
}

function start() {
    /*
        start each process, however at the beginning they will run at once and access shared variables, therefore
        we need to wait a bit before scheduling the next one. Once begun they shouldn't collide again.
    */
    sendRequests1();
    setTimeout(sendRequests4, 5000); // wait 5 seconds then start
    setTimeout(sendRequests24, 10000); // wait 10 seconds then start
}

start(); // starts the interval process of requesting
