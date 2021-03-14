const soqlParser = require("./query-parser.js");

const EXCLUDE_KEY_NAMES = ["@xsi:type", "type","attributes"];
const RECORDS = "records"
const ID = "ID"
const COUNT_ALL = "COUNT()"

class QueryResultParser{

    constructor(){
        this.sobjectType = null;
        this.queryFields = new Map();
        this.queryKeys = null;
        this.executedSoql = "";
        this.recordCount = "";
   }

    parse(request, queryResult) {

        if(queryResult.status == 1){

            return {done: false, data: JSON.stringify({error: queryResult.message})};

        }else{

            const parsedResult = this.getParsedQueryResult(request.soql, queryResult.result);

            const json = JSON.stringify({
                    header:parsedResult.columns,
                    rows:parsedResult.records,
                    soqlInfo: {
                        soql: request.soql,
                        tabId: request.tabId,
                        timestamp: parsedResult.recordCount - 1 + " rows@" + new Date().toLocaleString('ja-JP')
                    }
            });

            return {done: true, data: json};

        }
    };

    getParsedQueryResult(soql, queryResult){

        if(this.parseSoql(soql)){
            this.queryKeys = Array.from(this.queryFields.keys());
            this.executedSoql = soql
            this.recordCount = queryResult.totalSize;
        }else{
            this.queryKeys = Array.from(this.queryFields.keys())
            this.executedSoql = soql
            this.recordCount = "1"
            queryResult.records = [{COUNT_ALL: queryResult.totalSize}]
        }

        const records = []

        if(!queryResult || !Object.keys(queryResult).includes(RECORDS)){
            return this.format(records);
        }

        const parsedResult = this.parseQueryReuslt(queryResult);
        parsedResult.forEach(hash => {
            const record = [];
            this.queryKeys.forEach(key => {
                record.push(hash.get(key));
            })
            records.push(record);
        })

        return this.format(records)

    }

    format(records){
        return {
            soql : this.executedSoql,
            sobject: this.sobjectType,
            records : records,
            recordCount : this.recordCount,
            columns : this.queryKeys
        }
    }

    parseQueryReuslt(queryResult){

        const records = []

        const results = Array.isArray(queryResult.records) ? queryResult.records : [queryResult.records]

        results.forEach(result => {

            let record = new Map();

            this.extract(result).forEach((value, key) => {

                if(this.isReference(value)){

                    record = new Map([...record,...this.resolveReference(key, value)])

                }else if(this.isChild(value)){

                    record = new Map([...record,...this.resolveChild(key, value)])

                }else if(this.queryFields.has(key.toUpperCase())){

                    record = new Map([...record,...this.getMap(key, value)]);

                }
            })

            this.queryKeys.forEach(key => {
                if(!record.has(key)){
                    record = new Map([...record,[key, null]]);
                }
            })

            records.push(record);

        })

        return records;
    }

    isReference(value){

        if(value == null){
            return false;
        }

        if(this.isChild(value)){
            return false
        }else if(this.isMap(value) && Object.keys(value).length > 1){
            return true
        }else{
            return false
        }
    }

    isMap(o) {
        return typeof o == "object";
    }

    isChild(value){

        if(value == null){
            return false;
        }

        if(this.isMap(value) && value[RECORDS] != null){
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
        const childRecords = [];
        Array.from(records).forEach(record => {
            this.children = new Map();
            this.resolveDeepChild(record);
            childRecords.push(this.children);
        });

        return this.getMap(key, JSON.stringify(childRecords))
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

        const parsedSoql = soqlParser.parse(soql)

        this.sobjectType = parsedSoql["objects"][0]["objectName"]

        parsedSoql["fields"].forEach(field => {
            if(field["subQuery"]){
                const subQuery = field["subQuery"]
                this.queryFields.set([subQuery["objectName"]].toUpperCase(),"readOnly")
            }else if(field["function"]){
                const func = field["function"]
                if(func == "countAll"){
                    this.queryFields.set(COUNT_ALL, "readOnly")
                    return false
                }else{
                    this.queryFields.set(func.toUpperCase(),"readOnly")
                }
            }else{
                const fieldName = field["name"]
                if(fieldName == ID){
                    this.queryFields.set(fieldName.toUpperCase(),"readOnly")
                }else if(fieldName.includes(".")){
                    this.queryFields.set(fieldName.toUpperCase(),"readOnly");
                }else{
                    this.queryFields.set(fieldName.toUpperCase(),"text");
                }
            }
        })

        return true
    }

}

module.exports = QueryResultParser;