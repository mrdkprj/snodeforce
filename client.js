const { exec } = require('child_process');
const fs = require('fs');

const QUERY_COMMAND = "sfdx force:data:soql:query";
const APEX_COMMAND = "sfdx force:apex:execute";
const CODE_FILE = "./resource/code.txt";

module.exports = {

    query: function(req, res, callback) {
        const query = req.soql.replace(/\r|\n|\r\n/gi, " ");

        const command = `${ QUERY_COMMAND } -r csv -q "${ query }" -u ${ req.username } ${ req.tooling ? "-t" : ""}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return callback(res, {error:stderr});
            }else{
                return callback(res, stdout);
            }
        });
    },

    executeAnonymous: function(req, res, callback){
        fs.writeFileSync("./resource/code.txt", req.code);

        const command = `${ APEX_COMMAND } -f ${ CODE_FILE } -u ${ req.username } --loglevel debug --json`;

        exec(command,{maxBuffer: 1024*1024*10}, (error, stdout, stderr) => {
            if (error) {
                return callback(res, {error:JSON.parse(stderr).message})
            }else{
                return callback(res, stdout);
            }
        });
    }

};