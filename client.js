const { exec } = require('child_process');
const fs = require('fs');

const QUERY_COMMAND = "sfdx force:data:soql:query";
const APEX_COMMAND = "sfdx force:apex:execute";
const CODE_FILE = "./resource/code.txt";

module.exports = {
/*
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
*/
    query: function(req, res, callback) {

        const command = `${ QUERY_COMMAND } -q "${ req.soql }" -u ${ req.username } ${ req.tooling ? "-t" : ""} --json`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return callback(req, res, {error:stderr});
            }else{
                return callback(req, res, JSON.parse(stdout));
            }
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