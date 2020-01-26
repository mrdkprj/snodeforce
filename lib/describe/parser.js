const constants = require("./constants.js");

module.exports = {

    parse: function (result) {

        function parseFieldResult(fieldResult){

            return Array.prototype.concat.apply([],
                fieldResult.map(hash => convert_result(hash)).map(hash => sortMapByKey(hash))
            );

        }

        function sortMapByKey(hash){
            const sortedHash = {};
            Object.keys(hash).sort(sort_by(constants.keyOrder))
                            .filter(key => constants.includKey.includes(key))
                            .forEach(key => sortedHash[key] = hash[key]);
            return sortedHash;
        }

        function convert_result(rawHash){

            addMissingKeys(rawHash)

            const map_key = rawHash["type"];
            let type, length;
            if(constants.typeMapping[map_key]){
                type = getType(rawHash, constants.typeMapping[map_key]["label"]);
                length = getLength(rawHash, constants.typeMapping[map_key]["type"]);
            }else{
                type = rawHash["type"];
                length = null;
            }

            if(rawHash["type"] == "picklist"){
                const picklistValues = rawHash["picklistValues"];
                rawHash["picklistValues"] = getPicklistValues(picklistValues);
                rawHash["picklistLabels"] = getPicklistLabels(picklistValues);
            }

            rawHash["type"] = type;
            rawHash["length"] = length;

            return rawHash;
        }

        function getPicklistValues(picklistValues){

            let values = "";

            if(Array.isArray(picklistValues)){
                values = picklistValues.map(hash => hash["value"]);
            }else if(picklistValues == Object){
                values = [picklistValues["value"]];
            }

            return values.join("\n");
        }

        function getPicklistLabels(picklistValues){

            let labels = ""

            if(Array.isArray(picklistValues)){
                labels = picklistValues.map(hash => hash["label"]);
            }else if(picklistValues == Object){
                labels = [picklistValues["label"]];
            }

            return labels.join("\n");
        }

        function addMissingKeys(rawHash){

            if(!rawHash["referenceTo"]){
                rawHash["referenceTo"] = null;
            }

            if(!rawHash["calculatedFormula"]){
                rawHash["calculatedFormula"] = null;
            }

            if(!rawHash["externalId"]){
                rawHash["externalId"] = null;
            }

            if(!rawHash["picklistValues"]){
                rawHash["picklistValues"] = null;
            }

            if(!rawHash["picklistLabels"]){
                rawHash["picklistLabels"] = null;
            }

            if(!rawHash["inlineHelpText"]){
                rawHash["inlineHelpText"] = null;
            }

            if(!rawHash["defaultValueFormula"]){
                rawHash["defaultValueFormula"] = null;
            }

            return rawHash;
        }

        function getType(rawHash, rawTypeName){

            if(rawHash["autoNumber"]){
                return constants.typeMapping["autoNumber"]["label"];
            }

            if(rawHash["calculated"]){
                return constants.typeMapping["formula"]["label"] + "(" + rawTypeName + ")";
            }

            return rawTypeName;
        }

        function getLength(rawHash, dataType){

            if(dataType == "string"){
                return rawHash["length"];
            }

            if(dataType == "integer"){
                return rawHash["digits"] + ",0";
            }

            if(dataType == "double"){
                const precision = rawHash["precision"];
                const scale = rawHash["scale"];
                const size = parseInt(precision) - parseInt(scale);
                return size + ',' + scale;
            }

            return null;
        }

        function sort_by(sortKeys) {
            return (a, b) => {

                if(sortKeys.indexOf(a) > sortKeys.indexOf(b)) return 1;
                if(sortKeys.indexOf(a) < sortKeys.indexOf(b)) return -1;

                return 0;
            };
        }

        return parseFieldResult(result);
    }
}