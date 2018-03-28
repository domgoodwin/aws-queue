'use strict';

var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

const uuidV1 = require('uuid/v1');


exports.handler = function(event, context, callback){
    UpdateCase(event, callback);
}

function UpdateCase(event, callback) { 
    console.log(event);


    var caseID = uuidV1();
    var filter, exNames, exVals;

    if(!event['case_id'] || !event['state']){
        callback("Mandatory fields not supplied");
    }

    var updateExp = "SET update_dt = :u, #s = :s";
    var exAtNames = {"#s" : "state"};
    var exVals = {":u" : new Date().toISOString(), ":s" : event['state']};
    if(event['item']){
        updateExp += "case = :c";
        exVals[':c'] =  event['item'];
    }
  
    var params = {
        Key:{
            "case_id": event['case_id']
        },
        TableName : "queue-cases",
        UpdateExpression: updateExp,
        ExpressionAttributeNames: exAtNames,
        ExpressionAttributeValues: exVals
    };
    console.log("Update with params", params);
    documentClient.update(params, function(err, data){
        if(err){
            console.error("Unable to update ", JSON.stringify(err, null, 2));
        } else {
            console.log("Update success");
        }
        callback(err, data);
    });
    
}
