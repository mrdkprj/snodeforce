const soqlParser = require("./query-parser.js");

const EXCLUDE_KEY_NAMES = ["@xsi:type", "attributes"];
const RECORDS = "records"
const ID = "ID"
const AGGREGATE = "EXPR"

class QueryResultParser{

    static parse(request, queryResult) {

        if(queryResult.status == 1){

            return {
                done: false,
                data: JSON.stringify({error: queryResult.message})
            };

        }

        const parsedResult = this.getParsedQueryResult(request.soql, queryResult.result);

        return {
            done: true,
            data: JSON.stringify({
                header:parsedResult.columns,
                rows:parsedResult.records,
                soqlInfo: {
                    soql: request.soql,
                    tabId: request.tabId,
                    timestamp: parsedResult.recordCount + " rows@" + new Date().toLocaleString('ja-JP')
                }
            })
        };

    };

    static getParsedQueryResult(soql, queryResult){

        const parsedSOQL = this.parseSoql(soql);
        const fields = parsedSOQL.rawQueryFields;
        const records = this.parseQueryReuslt(queryResult, parsedSOQL.queryFields);

        return {
            sobject: parsedSOQL.sobjectType,
            records : records,
            recordCount : queryResult.totalSize,
            columns : fields
        }

    }

    static parseQueryReuslt(queryResult, queryFields){

        const records = []

        const results = Array.isArray(queryResult.records) ? queryResult.records : [queryResult.records]

        results.forEach(result => {

            let recordMap = new Map();

            this.extract(result).forEach((value, key) => {

                if(this.isReference(value)){

                    recordMap = new Map([...recordMap,...this.resolveReference(key, value)])

                }else if(this.isChild(value)){

                    recordMap = new Map([...recordMap,...this.resolveChild(key, value)])

                }else if(queryFields.has(key.toUpperCase())){

                    recordMap = new Map([...recordMap,...this.getMap(key, value)]);

                }
            })

            const record = [];

            queryFields.forEach((_, key) => {
                if(recordMap.has(key)){
                    record.push(recordMap.get(key));
                }else{
                    record.push(null);
                }
            })



            records.push(record);

        })

        return records;
    }

    static isReference(value){

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

    static isMap(o) {
        return typeof o == "object";
    }

    static isChild(value){

        if(value == null){
            return false;
        }

        if(this.isMap(value) && value[RECORDS] != null){
            true
        }else{
            false
        }
    }

    static resolveReference(key, value){
        this.reference = new Map();

        if(value){
            this.resolveDeepReference(key, this.extract(value))
        }

        return this.reference
    }

    static resolveDeepReference(key, value){
        value.forEach((v, k) => {
            if(this.isMap(v)){
                this.resolveDeepReference(key + "." + k, this.extract(v))
            }else{
                this.reference = new Map([...this.reference,...this.getMap(key + "." + k, v)])
            }
        })
    }

    static resolveChild(key,value){
        const records = value.records;
        const childRecords = [];
        Array.from(records).forEach(record => {
            this.children = new Map();
            this.resolveDeepChild(record);
            childRecords.push(this.children);
        });

        return this.getMap(key, JSON.stringify(childRecords))
    }

    static resolveDeepChild(record, key){
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


    static extract(record){
        let result = new Map();
        new Map(Object.entries(record)).forEach((v,k) => {
            if(!this.skipRequired(k, v)){
                result = new Map([...result,...this.removeDuplicateId(k, v)]);
            }
        })
        return result;
    }

    static getMap(key, value){
        return new Map([[key.toUpperCase(), value]]);
    }

    static skipRequired(key, value){

        if(EXCLUDE_KEY_NAMES.includes(key.toLowerCase())){
            return true
        }else if(key.toUpperCase() == ID && !value){
            return true
        }else{
            return false
        }
    }

    static removeDuplicateId(key, value){
        if(key.toUpperCase() == ID && Array.isArray(value)){
            return new Map([[key, value[0]]]);
        }else{
            return new Map([[key, value]]);
        }
    }

    static parseSoql(soql){

        let parsedSoql;
        try{
            parsedSoql = soqlParser.parse(soql);
        }catch(ex){
            return {done: false};
        }

        const queryFields = new Map();
        const rawQueryFields = [];
        const sobjectType = parsedSoql["objects"][0]["objectName"];
        let expCount = 0;

        parsedSoql["fields"].forEach(field => {

            if(field["subQuery"]){

                const subQuery = field["subQuery"];
                rawQueryFields.push([subQuery["objectName"]]);
                queryFields.set([subQuery["objectName"]].toUpperCase(),"readOnly");

            }else if(field["function"]){

                const func = field["function"]
                if(func == "countAll"){
                    rawQueryFields.push(AGGREGATE);
                    queryFields.set(AGGREGATE, "readOnly");
                    isAggregate = true;
                }else{
                    rawQueryFields.push(func);
                    queryFields.set(AGGREGATE + expCount,"readOnly");
                    expCount++;
                }

            }else{

                const fieldName = field["name"]
                rawQueryFields.push(fieldName);
                if(fieldName == ID){
                    queryFields.set(fieldName.toUpperCase(),"readOnly");
                }else if(fieldName.includes(".")){
                    queryFields.set(fieldName.toUpperCase(),"readOnly");
                }else{
                    queryFields.set(fieldName.toUpperCase(),"text");
                }

            }
        })

        return {
            done: true,
            sobjectType: sobjectType,
            queryFields: queryFields,
            rawQueryFields: rawQueryFields,
        }
    }

}

module.exports = QueryResultParser;