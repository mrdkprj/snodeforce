const URL = require("url").URL;
const fs = require("fs");
const client = require("./client.js");
const queryResultParser = require("./lib/parser/query-result-parser.js");
const describeResultParser = require("./lib/parser/describe-result-parser.js");
const apexResultParser = require("./lib/parser/apex-result-parser.js");

    module.exports = {
        handleRequest: (request, response) => {
            response.writeHead(200, {"Content-Type": "text/html"});
            const path = new URL(request.url, "relative:///").pathname;
            switch (path) {
                case "/":
                    renderHTML("./view/main.html", response);
                    break;
                case "/test":
                    parseQueryResultTest(response);
                    break;
                case "/soql":
                    onPostRequest(request, requestBody => executeQuery(requestBody, response));
                    break;
                case "/listsobjects":
                    onPostRequest(request, requestBody => listSObjects(requestBody, response));
                    break;
                case "/describe":
                    onPostRequest(request, requestBody => describeSObject(requestBody, response));
                    break;
                case "/apex":
                    onPostRequest(request, requestBody => executeAnonymous(requestBody, response));
                    break;
                default:
                    response.writeHead(404, {"Content-Type": "application/json"});
                    response.write(JSON.stringify({error:"Route not defined"}));
                    response.end();
            }
        }
    };

    const renderHTML = (path, response) => {
        fs.readFile(path, null, function(error, data) {
            if (error) {
                response.writeHead(404);
                response.write("File does not exists!");
            } else {
                response.write(data);
            }
            response.end();
        });
    };

    const onPostRequest = (request, callback) => {
        let body = "";

        request.on("data", (data) => {
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                request.connection.destroy();
        });

        request.on("end", () => {
            callback(JSON.parse(body));
        });
    };

    const executeQuery = (request, response) => {

        const query = request.soql.replace(/\r|\n|\r\n/gi, " ").replace(";", "");

        request.soql = query;

        client.query(request, response, afterExecuteQuery);
    }

    const afterExecuteQuery = (request, response, queryResult) => {

        const result = queryResultParser.parse(request, queryResult);

        if(result.done == false){
            response.writeHead(400, {"Content-Type": "text/json"});
        }else{
            response.writeHead(200, {"Content-Type": "text/json"});
        }

        response.end(result.data);
    }

    const listSObjects = (request, response) => {
        client.listSObjects(request, response, afterListSObjects);
    }

    const afterListSObjects = (response, listResult) => {
        const result = describeResultParser.parseListSobjects(listResult);

        if(result.done == false){
            response.writeHead(400, {"Content-Type": "text/json"});
        }else{
            response.writeHead(200, {"Content-Type": "text/json"});
        }

        response.end(result.data);
    }

    const describeSObject = (request, response) => {
        client.describe(request, response, afterDescribeSObject);
    }

    const afterDescribeSObject = (response, describeResult) => {
        const result = describeResultParser.parse(describeResult);

        if(result.done == false){
            response.writeHead(400, {"Content-Type": "text/json"});
        }else{
            response.writeHead(200, {"Content-Type": "text/json"});
        }

        response.end(result.data);
    }

    const executeAnonymous = (request, response) => {
        client.executeAnonymous(request, response, afterExecuteAnonymous);
    }

    const afterExecuteAnonymous = (response, apexResult) => {

        const result = apexResultParser.parse(apexResult);

        if(result.done == false){
            response.writeHead(400, {"Content-Type": "text/json"});
        }else{
            response.writeHead(200, {"Content-Type": "text/json"});
        }

        response.end(result.data);
    }

    const parseQueryResultTest  = (response) => {
        const text = fs.readFileSync("sample.json");
        response.writeHead(200, {"Content-Type": "text/json"});
        response.end(text);
    };