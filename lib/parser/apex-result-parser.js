const SPLIT_LIMIT = 3;
const LOG_HEADER = ["Timestamp", "Event", "Details"];

class ApexResultParser{

    static parse(apexResult){

        const result = apexResult.result;

        if(!result.success){

            let message;
            if(result.compiled){
                message = result.exceptionStackTrace + "\n" + result.exceptionMessage;
            }else{
                message = result.compileProblem;
            }

            return {
                done: false,
                data: JSON.stringify({error: message})
            }

        }

        let logs = result.logs.split("\n").map(str => this.splitLimit(str));

        logs = logs.filter(log => log.length >= 1).map(log => this.format(log));

        return {
            done: true,
            data: JSON.stringify({
                logName: "executeAnonymous@" + new Date().toLocaleString('ja-JP'),
                header: LOG_HEADER,
                rows: logs,
            })
        };
    };

    static splitLimit(str){

        const all = str.split("|");

        if(all.length > SPLIT_LIMIT){
            const splits = all.slice(0, SPLIT_LIMIT - 1);
            splits.push(all.slice(SPLIT_LIMIT).join("|"));
            return splits;
        }else{
            return all;
        }
    };

    static format(log){
        if(log.length == 1){
            return ["","",log[0]];
        }else if(log.length == 2){
            return [log[0],log[1],""];
        }else{
            return log;
        }
    };

}

module.exports = ApexResultParser;