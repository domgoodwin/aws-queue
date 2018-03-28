'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();
    
var lambda = new AWS.Lambda({
    region: 'eu-west-2' //change to your region
});

const uuidV1 = require('uuid/v1');


exports.handler = function(event, context, callback){
    GetCase(event, callback);
}

function GetCase(event, callback) { 
    //console.log(event);


    var caseID = uuidV1();
    var filter, exNames, exVals;

    if(event['queryStringParameters']['case_id']){
        filter = "#case = :case";
        exNames = { "#case": "case_id"};
        exVals = { ":case" : event['queryStringParameters']['case_id']};
    } else if (event['queryStringParameters']['state'] && event['queryStringParameters']['queue']){
        filter = "#qu = :qu and #st = :st";
        exNames = { "#qu": "queue", "#st": "state"};
        exVals = {":qu" : event['queryStringParameters']['queue'], ":st" : event['queryStringParameters']['state']};
    } else if(event['queryStringParameters']['queue']){
        filter = "#qu = :qu and not #st = :st";
        exNames = { "#qu": "queue", "#st": "state"};
        exVals = {":qu" : event['queryStringParameters']['queue'], ":st" : "pending"};
    } else {
        callback(null, {"statusCode": 500, "headers": {},"body": JSON.stringify(err), "isBase64Encoded": false});
    }

    var params = {
        FilterExpression: filter,
        ExpressionAttributeNames: exNames,
        ExpressionAttributeValues: exVals,
        TableName: "queue-cases"
    };
    console.log("Scan with params", params);
    documentClient.scan(params, function(err, data){
        if(err){
            console.error("Unable to query: ", JSON.stringify(err, null, 2));
        } else if(data['Count'] > 0) {
            console.log("Successful query");
            //console.log(data);
            var oldestItem = {};
            data['Items'].forEach(function(value){
                if(!oldestItem['creation_dt']){
                    oldestItem = value;
                } else if(value['creation_dt'] < oldestItem['creation_dt']){
                    oldestItem = value;
                }
            });

            // update item call
            var params = {
                FunctionName: 'queue-update',
                InvocationType: 'RequestResponse',
                Payload: JSON.stringify({"case_id" : oldestItem['case_id'], "state": "pending"}) // pass params
              };
            lambda.invoke(params, function(error, data) {
                if (error) {
                    console.error(error);
                    callback(null, {"statusCode": 500, "headers": {},"body": JSON.stringify(error), "isBase64Encoded": false});
                } else{
                    console.log("Item updated to mark as pending")
                    console.log(data);
                }
              });

            callback(null, {"statusCode": 200, "headers": {}, "body":  JSON.stringify(oldestItem), "isBase64Encoded": false});
        } else {
            callback(null, {"statusCode": 200, "headers": {}, "body":  {}, "isBase64Encoded": false});
        }
    })
    
}
