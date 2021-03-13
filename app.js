const url = require('url');
const fs = require('fs');
const client = require("./client.js");
const queryResultParser = require("./lib/soql/query-result-parser.js");
const Log_split_char = "|";
const Log_split_limit = 3;
const Log_headers = ["Timestamp", "Event", "Details"];

    module.exports = {
        handleRequest: (request, response) => {
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
                    onPostRequest(request, requestBody => executeQuery(requestBody, response));
                    break;
                case '/apex':
                    onPostRequest(request, requestBody => client.executeAnonymous(requestBody, response, parseApexResult));
                    break;
                case '/listsobjects':
                    onPostRequest(request, requestBody => client.listSobjects(requestBody, response, parseListSobjects));
                    break;
                case '/describe':
                    onPostRequest(request, requestBody => client.describe(requestBody, response, parseDescribeResult));
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

        const result = new queryResultParser().parse(request, queryResult);

        if(result.done == false){
            response.writeHead(400, {'Content-Type': 'text/json'});
        }else{
            response.writeHead(200, {'Content-Type': 'text/json'});
        }

        response.end(result.data);
    }

    const parseQueryResultTest  = (response) => {
        const text = fs.readFileSync("sample.json");
        response.writeHead(200, {'Content-Type': 'text/json'});
        response.end(text);
    };

    const parseApexResult = (response, apexResult) => {

        const result = apexResult.result;

        if(result.success == false && result.compiled == false){
            response.writeHead(400, {'Content-Type': 'text/json'});
            const location = "Line:" + result.line + ", Column: " + result.column;
            const message = {
                error: location + "\n" + result.compileProblem
            }
            response.end(JSON.stringify(message));
        }else{
            let logs = result.logs.split("\n").map(str => splitLimit(str));
            logs = logs.filter(log => log.length >= 1).map(log => fill_blank(log));
            response.writeHead(200, {'Content-Type': 'text/json'});
            response.end(JSON.stringify(
                {
                    logName: "executeAnonymous@" + new Date().toLocaleString('ja-JP'),
                    header:Log_headers,
                    rows:logs,
                    readOnly: true,
                }
            ));
        }
    };

    const splitLimit = (str) => {

        const all = str.split("|");

        if(all.length > Log_split_limit){
            const splits = all.slice(0, Log_split_limit - 1);
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

    const parseListSobjects = (response, apexResult) => {

        if(apexResult.status != 0){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({error: apexResult.message}));
            return;
        }

        response.writeHead(200, {'Content-Type': 'text/json'});
        response.end(JSON.stringify({lists:apexResult.result}));

    }

    const parseDescribeResult = (response, describeResult) => {

        if(describeResult.status != 0){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({error: describeResult.message}));
            return;
        }

        const result = describeResult.result;
        const rows = [];

        const flatten = ([k,v]) => {

            if(k == "picklistValues"){

                const values = Array.from(v).map((obj) => obj["value"]).join("\n");
                return [k, values];
            }

            if(Array.isArray(v)){
                return [k, v.join("\n")];
            }

            return [k, v];
        }

        result.fields.forEach((field) => {

            const row = Object.entries(field).sort(([a,],[b,]) => fields.indexOf(a) - fields.indexOf(b))
            .filter(([k,v]) => fields.includes(k))
            .map(([k,v]) => flatten([k,v]))
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

            rows.push(Object.values(row));
        })

        response.writeHead(200, {'Content-Type': 'text/json'});
        response.end(JSON.stringify(
            {
                name: result.name,
                label: result.label,
                prefix: result.keyPrefix,
                header: fields,
                rows: rows,
            }
        ));

    }

const fields = ["label",
"name",
"type",
"custom",
"length",
"byteLength",
"digits",
"precision",
"scale",
"autoNumber",
"calculated",
"calculatedFormula",
"formulaTreatNullNumberAsZero",
"caseSensitive",
"picklistValues",
"controllerName",
"dependentPicklist",
"restrictedPicklist",
"inlineHelpText",
"referenceTo",
"relationshipName",
"relationshipOrder",
"defaultValue",
"defaultValueFormula",
"encrypted",
"externalId",
"nillable",
"unique",
"aggregatable",
"aiPredictionField",
"cascadeDelete",
"compoundFieldName",
"createable",
"defaultedOnCreate",
"deprecatedAndHidden",
"displayLocationInDecimal",
"extraTypeInfo",
"filterable",
"filteredLookupInfo",
"groupable",
"highScaleNumber",
"htmlFormatted",
"idLookup",
"mask",
"maskType",
"nameField",
"namePointing",
"permissionable",
"polymorphicForeignKey",
"queryByDistance",
"referenceTargetField",
"restrictedDelete",
"searchPrefilterable",
"sortable",
"updateable",
"writeRequiresMasterRead",
"soapType"
];
