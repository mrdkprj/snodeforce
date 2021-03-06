const { exec } = require('child_process');
const fs = require('fs');

const QUERY_COMMAND = "sfdx force:data:soql:query";
const LIST_COMMAND = "sfdx force:schema:sobject:list";
const DESCRIBE_COMMAND = "";
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
    },

    listSobjects: function(req, res, callback){

        const fileName = './resource/sobjects.json';

        fs.access(fileName, fs.constants.F_OK, (err) => {
            if(!err){
                const text = fs.readFileSync(fileName);
                return callback(res, JSON.parse(text));
            }
        })

        const command = `${ LIST_COMMAND } -u ${ req.username } -c ALL --json`;

        exec(command,{maxBuffer: 1024*1024*100}, (error, stdout, stderr) => {
            if (error) {
                return callback(res, {error:stderr})
            }else{
                fs.writeFileSync(fileName, stdout);
                return callback(res, JSON.parse(stdout));
            }
        });
    },

    describe: function(req, res, callback){

    }
};