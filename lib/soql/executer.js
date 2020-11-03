const client = require("../../client.js");
const parser = require("./parser.js");

const EXCLUDE_KEY_NAMES = ["@xsi:type", "type","attributes"];
const RECORDS = "records"
const TYPE = "type"
const ID = "ID"
const COUNT_ALL = "COUNT()"
const EXPR = "EXPR"
const AGGREGATE_RESULT = "AggregateResult"

class executer{

    constructor(){
        this.sobject_type = null;
        this.query_fields = new Map();
        this.query_keys = null;
        this.executed_soql = "";
        this.recordCount = "";
    }

    query(req, res, callback) {

        const query = req.soql.replace(/\r|\n|\r\n/gi, " ").replace(";", "");

        const command = `${ QUERY_COMMAND } -r csv -q "${ query }" -u ${ req.username } ${ req.tooling ? "-t" : ""}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return callback(req, res, {error:stderr});
            }else{
                return callback(req, res, stdout);
            }
        });
    }

    execute(req, res){
        const query = req.soql.replace(/\r|\n|\r\n/gi, " ").replace(";", "");

        req.soql = query;

        client.query(req, res, this.parseQueryResult.bind(this));
    }

    parseQueryResult(request, response, queryResult) {

        if(queryResult.status == 1){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({error: queryResult.message}));
        /*}else if(queryResult.result.totalSize == 0){
            response.writeHead(400, {'Content-Type': 'text/json'});
            response.end(JSON.stringify({error: queryResult.message}));
            */
        }else{
            const parsedResult = this.getParsedQueryResult(request.soql, queryResult.result);

            response.writeHead(200, {'Content-Type': 'text/json'});
            const json = JSON.stringify({
                    header:parsedResult.columns,
                    rows:parsedResult.records,
                    soqlInfo: {
                        soql: request.soql,
                        tabId: request.tabId,
                        timestamp: parsedResult.recordCount - 1 + " rows@" + new Date().toLocaleString('ja-JP')
                    }
                });
            response.end(json);
/*
            if(result.startsWith(QUERY_NO_RESULT)){
                response.writeHead(400, {'Content-Type': 'text/json'});
                response.end(JSON.stringify({error:result}));
            }else{
                const txt = csv.CSVToArray(result, ",");
                txt.pop();
                response.writeHead(200, {'Content-Type': 'text/json'});
                const json = JSON.stringify({
                        header:txt[0],
                        rows:txt.slice(1),
                        soqlInfo: {
                            soql: request.soql,
                            tabId: request.tabId,
                            timestamp: txt.length - 1 + " rows@" + new Date().toLocaleString('ja-JP')
                        }
                    });
                response.end(json);
            }
*/
        }
    };

    getParsedQueryResult(soql, queryResult){
        console.log(queryResult.records)

        if(this.parseSoql(soql)){
            this.query_keys = Array.from(this.query_fields.keys());
            this.executed_soql = soql
            this.recordCount = queryResult.totalSize;
        }else{
            this.query_keys = Array.from(this.query_fields.keys())
            this.executed_soql = soql
            this.recordCount = "1"
            queryResult.records = [{COUNT_ALL: queryResult.totalSize}]
        }

        const records = []

        if(!queryResult || !Object.keys(queryResult).includes(RECORDS)){
            return this.createResponse(records);
        }

        const parsedResult = this.parseQueryReuslt(queryResult);
        parsedResult.forEach(hash => {
            const record = [];
            this.query_keys.forEach(key => {
                record.push(hash.get(key));
            })
            records.push(record);
        })

        return this.createResponse(records)

    }

    createResponse(records){
        return {
            soql : this.executed_soql,
            sobject: this.sobject_type,
            records : records,
            recordCount : this.recordCount,
            columns : this.query_keys
        }
    }

    parseQueryReuslt(queryResult){

        const records = []

        const results = Array.isArray(queryResult.records) ? queryResult.records : [queryResult.records]

        results.forEach(result => {

            if(result[TYPE] && result[TYPE] != AGGREGATE_RESULT){
                this.sobject_type = result[TYPE];
            }

            let record = new Map();

            this.extract(result).forEach((v,k) => {

                if(this.isReference(k, v)){
                    record = new Map([...record,...this.resolveReference(k, v)])
                }else if(this.isChild(v)){
                    record = new Map([...record,...this.resolveChild(k, v)])
                }else{
                    if(this.query_fields.has(k.toUpperCase())){
                        record = new Map([...record,...this.getMap(k, v)]);
                    }
                }
            })

            this.query_keys.forEach(key => {
                if(!record.has(key)){
                    record = new Map([...record,[key, null]]);
                }
            })

            records.push(record);

        })

        return records;
    }

    isReference(key, value){
        if(this.isChild(value)){
            return false
        }else if(this.isMap(value) && value.size > 1){
            return true
        }else{
            return false
        }
    }

    isMap(o) {
        try {
            Map.prototype.has.call(o);
            return true;
        } catch(e) {
            return false;
        }
    }

    isChild(value){
        if(this.isMap(value) && value.has(RECORDS)){
            true
        }else{
            false
        }
    }

    resolveReference(key, value){
        this.reference = new Map();

        if(value){
            this.resolveDeepReference(key, this.extract(value))
        }

        return this.reference
    }

    resolveDeepReference(key, value){
        value.forEach((v, k) => {
            if(this.isMap(v)){
                this.resolveDeepReference(key + "." + k, this.extract(v))
            }else{
                this.reference = new Map([...this.reference,...this.getMap(key + "." + k, v)])
            }
        })
    }

    resolveChild(key,value){
        const records = value.records;
        const child_records = [];
        Array.from(records).forEach(record => {
            this.children = new Map();
            this.resolveDeepChild(record);
            child_records.push(this.children);
        });

        return this.getMap(key, JSON.stringify(child_records))
    }

    resolveDeepChild(record, key){
        record.forEach((v,k) => {
            if(!this.skipRequired(k, v)){
                if(this.isMap(v)){
                    this.resolveDeepChild(v, k)
                }else{
                    if(!key){
                        this.children = new Map([...this.children,...[k,v]])
                    }else{
                        this.children = new Map([...this.children,...[key,[k, v]]])
                    }
                }
            }
        })
    }


    extract(record){
        let result = new Map();
        new Map(Object.entries(record)).forEach((v,k) => {
            if(!this.skipRequired(k, v)){
                result = new Map([...result,...this.removeDuplicateId(k, v)]);
            }
        })
        return result;
    }

    getMap(key, value){
        return new Map([[key.toUpperCase(), value]]);
    }

    skipRequired(key, value){

        if(EXCLUDE_KEY_NAMES.includes(key.toLowerCase())){
            return true
        }else if(key.toUpperCase() == ID && !value){
            return true
        }else{
            return false
        }
    }

    removeDuplicateId(key, value){
        if(key.toUpperCase() == ID && Array.isArray(value)){
            return new Map([[key, value[0]]]);
        }else{
            return new Map([[key, value]]);
        }
    }

    parseSoql(soql){

        const parse_result = parser.parse(soql)

        this.sobject_type = parse_result["objects"][0]["objectName"]

        parse_result["fields"].forEach(field => {
            if(field["subQuery"]){
                const subQuery = field["subQuery"]
                this.query_fields.set([subQuery["objectName"]].toUpperCase(),"readOnly")
            }else if(field["function"]){
                const func = field["function"]
                if(func == "countAll"){
                    this.query_fields.set(COUNT_ALL, "readOnly")
                    return false
                }else{
                    this.query_fields.set(func.toUpperCase(),"readOnly")
                }
            }else{
                const field_name = field["name"]
                if(field_name == ID){
                    this.query_fields.set(field_name.toUpperCase(),"readOnly")
                }else if(field_name.includes(".")){
                    this.query_fields.set(field_name.toUpperCase(),"readOnly");
                }else{
                    this.query_fields.set(field_name.toUpperCase(),"text");
                }
            }
        })

        return true
    }

}

module.exports = executer;