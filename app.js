var request = require('request');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            "timestamp":true,
            "colorize": true

        }),
        new (winston.transports.File)({ filename: 'D:/data_fetcher/log/fetcher.log' })
    ]
});


var endpoint = "http://localhost";
var port = ":3000";
var tokenList  = [
    "u1r_4oEFjcERitMMWaygT0HZjwblB7qMPAxB0JJSceafi4xZAqlZmNJuJ6MD-KTmnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP", // bhav token
    'u1r_4oEFjcGXMeBUkvDdikHZjwblB7qMPAxB0JJSceafi4xZAqlZmKvq7UPSdXGUnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP'
]; // dan token

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

// function to send a POST request to the rest_app to update the DB
function postRequest(endpoint, port, path, jsonData,callback) {
    request.post(
        endpoint + port + path,
        jsonData,
        function optionalCallback(err, httpResponse, body) {
            if (httpResponse.statusCode != 200) {
                return logger.error('request failed with :' + httpResponse.statusCode.toString(), err);
            } else {
                logger.debug('Successful!  Server responded with: \n', JSON.stringify(body, null, 2));
                var json_res = JSON.parse(JSON.stringify(body, null, 2));
                if (!json_res.Jawbone.error && !json_res.DynamoDB.error){
                    logger.info("OK: postRequest(" + path + ")\n");
                }

                return callback();
            }
        });

}


// function to call POST requests for each Jawbone activity
function sendRequests(token, callback) {
    logger.debug("---Selecting token: " + token + "\n");
    var json = {json: {token: token}};
    var i = 0;


    // callback function, executed once the previous post request has completed
    var nextRequest = function () {
        i++;
        if (i < pathList.length) {
            postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
        } else {
            return callback();
        }
    };

    // first post request, which triggers the rest via the callback
    postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
}


// loop through each user (token) and update DB
var i = 0;
var nextUser = function() {
    i++;
    if (i < tokenList.length) {
        sendRequests(tokenList[i], nextUser);
    }
};

// first user request, which triggers the rest via the callback
sendRequests(tokenList[i], nextUser);