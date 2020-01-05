    const url = require('url');
    const fs = require('fs');
    const client = require("./client.js");
    const csv = require("./lib/csv.js");
    const Log_split_char = "|";
    const Log_split_limit = 3;
    const Log_headers = ["Timestamp", "Event", "Details"];

    module.exports = {
        handleRequest: function(request, response) {
            response.writeHead(200, {'Content-Type': 'text/html'});
            const path = url.parse(request.url).pathname;
            switch (path) {
                case '/':
                    renderHTML('./view/main.html', response);
                    break;
                case '/test':
                    parseQueryResultTest(response);
                    break;
                case '/soql':
                    onPostRequest(request, body => client.query(body, response, parseQueryResult));
                    break;
                case '/apex':
                    onPostRequest(request, body => client.executeAnonymous(body, response, parseApexResult));
                    break;
                default:
                    response.writeHead(404, {'Content-Type': 'application/json'});
                    response.write(JSON.stringify({error:'Route not defined'}));
                    response.end();
            }
        }
    };

    const renderHTML = (path, response) => {
        fs.readFile(path, null, function(error, data) {
            if (error) {
                response.writeHead(404);
                response.write('File does not exists!');
            } else {
                response.write(data);
            }
            response.end();
        });
    };

    const onPostRequest = (request, callback) => {
        let body = '';

        request.on('data', function (data) {
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                request.connection.destroy();
        });

        request.on('end', function () {
            //client.query(JSON.parse(body), response, parseQueryResult);
            callback(JSON.parse(body));
        });
    };

    const parseQueryResultTest  = (response) => {
        const text = fs.readFileSync("sample.json");
        response.writeHead(200, {'Content-Type': 'text/json'});
        response.end(text);
    };

    const parseQueryResult = (response, result) => {
        if(result.error){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify(result));
        }else{
            let txt = csv.CSVToArray(result, ",");
            txt.pop();
            response.writeHead(200, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({header:txt[0],rows:txt.slice(1)}));
        }
    };


    const parseApexResult = (response, apexResult) => {
        if(apexResult.error){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify(apexResult));
        }else{
            let logs = JSON.parse(apexResult).result.logs.split("\n").map(str => splitLimit(str));
            logs = logs.filter(log => log.length >= 1).map(log => fill_blank(log));

            response.writeHead(200, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({header:Log_headers, rows:logs}));
        }
    };

    const splitLimit = (str) => {
        let all = str.split("|");
        if(all.length > Log_split_limit){
            let splits = all.slice(0, Log_split_limit - 1);
            splits.push(all.slice(Log_split_limit).join(Log_split_char));
            return splits;
        }else{
            return all;
        }
    };

    const fill_blank = (log) => {
        if(log.length == 1){
            return ["","",log[0]];
        }else if(log.length == 2){
            return [log[0],log[1],""];
        }else{
            return log;
        }
    };