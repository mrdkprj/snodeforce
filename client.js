const { exec } = require('child_process');
const fs = require('fs');

const QUERY_COMMAND = "sfdx force:data:soql:query";
const APEX_COMMAND = "sfdx force:apex:execute";
const LIST_COMMAND = "sfdx force:schema:sobject:list -c all"
const CODE_FILE = "./resource/code.txt";

module.exports = {

    query: function(req, res, callback) {
        const query = req.soql.replace(/\r|\n|\r\n/gi, " ").replace(";", "");

        const command = `${ QUERY_COMMAND } -r csv -q "${ query }" -u ${ req.username } ${ req.tooling ? "-t" : ""}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return callback(req, res, {error:stderr});
            }else{
                return callback(req, res, stdout);
            }
        });
    },

    getSObjectList: function(req, res, callback){

        if(req.init){
            try{
                const sobjects = JSON.parse(fs.readFileSync("./resource/sobjects.json", 'utf8'));
                if(sobjects.username == req.username){
                    return callback(res, sobjects.result);
                }else{
                    return callback(res, {result:[]});
                }
            }catch(err){
                return callback(res, {result:[]});
            }
        }

        const command = `${ LIST_COMMAND } -u ${ req.username } --json`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return callback(res, {error:stderr});
            }else{
                const result = JSON.parse(stdout);
                fs.writeFileSync("./resource/sobjects.json", JSON.stringify({username: req.username, result:result.result}));
                return callback(res, result.result);
            }
        });
    },

    executeAnonymous: function(req, res, callback){
        fs.writeFileSync("./resource/code.txt", req.code);

        const command = `${ APEX_COMMAND } -f ${ CODE_FILE } -u ${ req.username } --loglevel debug`;

        exec(command,{maxBuffer: 1024*1024*100}, (error, stdout, stderr) => {
            if (error) {
                //return callback(res, {error:JSON.parse(stderr).message})
                return callback(res, {error:stderr})
            }else{
                return callback(res, stdout);
            }
        });
    }

};