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
    logPath = myArgs.logPath;
}
// create the log directory if it doesn't exist
if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}
var logLevel = "info";
if (myArgs.logLevel) {
    logLevel = myArgs.logLevel;
}

// set up logger
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            "timestamp":true,
            "colorize": true,
            "level": logLevel
        }),
        new (winston.transports.File)({
            filename: logPath + "/fetcher.log",
            "level": logLevel
        })
    ]
});

logger.debug("logPath = " + logPath);
var endpoint = "http://localhost";
var port = ":3000";
var tokenList  = [
    "u1r_4oEFjcERitMMWaygT0HZjwblB7qMPAxB0JJSceafi4xZAqlZmNJuJ6MD-KTmnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP", // bhav token
    'u1r_4oEFjcGXMeBUkvDdikHZjwblB7qMPAxB0JJSceafi4xZAqlZmKvq7UPSdXGUnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP' // dan token
];

// list of endpoints to call
var pathList = [
    "/settings/updateSettings",
    "/moves/updateMoves",
    "/heartrate/updateHeartRates",
    "/body/updateBodyEvents",
    "/mood/updateMood",
    "/sleeps/updateSleeps",
    "/workouts/updateWorkouts"
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
        }
    };

// function to send a POST request to the rest_app to update the DB
function postRequest(endpoint, port, path, jsonData,callback) {
    var success = true;
    request.post(
        endpoint + port + path,
        jsonData,
        function optionalCallback(err, httpResponse, body) {
            if (httpResponse.statusCode != 200) {
                return logger.error('request failed with :' + httpResponse.statusCode.toString(), err);
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
function sendRequests(token, callback) {
    logger.info("---Selecting token: " + token.substr(0,15) + "***********");
    var json = {json: {token: token}};
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
            if (successCount != pathList.length) { allSuccessful = false; }
            return callback(allSuccessful);
        }
    };

    // first post request, which triggers the rest via the callback
    postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
}


// loop through each user (token) and update DB
var i = 0;
var nextUser = function(allSuccessful) {
    // check that all of the requests returned successfully
    if (allSuccessful) {
        logger.info("SUCCESS!\n");
    } else {
        logger.info("1+ REQUESTS FAILED. See above");
    }

    i++;
    if (i < tokenList.length) {
        sendRequests(tokenList[i], nextUser);
    }
};

// first user request, which triggers the rest via the callback
sendRequests(tokenList[i], nextUser);
