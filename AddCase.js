'use strict';

var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

const uuidV1 = require('uuid/v1');


exports.handler = function(event, context, callback){
    AddCase(event, callback);
}

function AddCase(event, callback) { 

    if(!event['queue'] || !event['item']){
        callback("Error: mandatory fields are not present");
    }
    var caseID = uuidV1();

    var params = {
        Key: {
         "case_id": caseID
        },
        TableName: "queue-cases"
    };
     
    documentClient.get(params, function(err, data){
    if(err) {
        console.error(err);
        callback(err, data);
    } else  if (!Object.keys(data).length) {
        console.log("ID not in use");
        params = {
            Item:{
                "case_id": caseID,
                "creation_dt":  new Date().toISOString(),
                "update_dt": new Date().toISOString(),
                "queue": event['queue'],
                "state": (event['state']) ? event['state'] : "new",
                "case": event['item']
            },
                TableName : "queue-cases"
            };
        documentClient.put(params, function(err, data){
            if(err){
                console.error("Unable to add case " + JSON.stringify(err, null, 2));
            } else {
                console.log("Case added: " + caseID); 
                callback(null, {"id" : caseID});
            }
            callback(err, data);
        });        
    } else {
        // Retry
        console.log("ID in use, retrying");
        AddCase(callback);
    }
    });
    
}
