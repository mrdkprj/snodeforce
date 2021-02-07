const { exec } = require('child_process');
const fs = require('fs');

const QUERY_COMMAND = "sfdx force:data:soql:query";
const APEX_COMMAND = "sfdx force:apex:execute";
const CODE_FILE = "./resource/code.txt";

module.exports = {

    query: function(req, res, callback) {

        const command = `${ QUERY_COMMAND } -q "${ req.soql }" -u ${ req.username } ${ req.tooling ? "-t" : ""} --json`;

        exec(command, {maxBuffer: 1024*1024*100}, (error, stdout, stderr) => {
            return callback(req, res, JSON.parse(stdout));
        });
    },

    executeAnonymous: function(req, res, callback){
        fs.writeFileSync("./resource/code.txt", req.code);

        const command = `${ APEX_COMMAND } -f ${ CODE_FILE } -u ${ req.username } --loglevel debug --json`;

        exec(command,{maxBuffer: 1024*1024*100}, (error, stdout, stderr) => {
            return callback(res, JSON.parse(stdout));
        });
    }

};