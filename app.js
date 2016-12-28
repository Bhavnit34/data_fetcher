var request = require('request');

var endpoint = "http://52.208.153.178";
var port = ":3000";
var bhav_token = "u1r_4oEFjcERitMMWaygT0HZjwblB7qMPAxB0JJSceafi4xZAqlZmNJuJ6MD-KTmnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP";
var dan_token = 'u1r_4oEFjcGXMeBUkvDdikHZjwblB7qMPAxB0JJSceafi4xZAqlZmKvq7UPSdXGUnHGv14YiRz_SZK_iqV7QIVECdgRlo_GULMgGZS0EumxrKbZFiOmnmAPChBPDZ5JP';

var path = "/api/mood/updateMood";

function postRequest(endpoint, port, path, jsonData,callback) {
    console.log("postRequest(" + path + ")\n");
    request.post(
        endpoint + port + path,
        jsonData,
        function optionalCallback(err, httpResponse, body) {
            if (httpResponse.statusCode != 200) {
                return console.error('upload failed:', err);
            } else {
                console.log('Successful!  Server responded with: \n', JSON.stringify(body, null, 2));
                return callback();
            }
        });

}

var pathList = [
    "/settings/updateSettings",
    "/moves/updateMoves",
    "/heartrate/updateHeartRates",
    "/body/updateBodyEvents",
    "/mood/updateMood",
    "/sleeps/updateSleeps",
    "/workouts/updateWorkouts"
];



var json = {json: {token: bhav_token}};
var i = 0;



var nextRequest = function() {
    i++;
    if (i < pathList.length) {
        postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
    }
};


postRequest(endpoint, port, "/api" + pathList[i], json, nextRequest);
