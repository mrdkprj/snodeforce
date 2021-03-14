const fields = [
    "label", "name", "type", "custom", "length", "byteLength", "digits", "precision", "scale", "autoNumber",
    "calculated", "calculatedFormula", "formulaTreatNullNumberAsZero", "caseSensitive", "picklistValues",
    "controllerName", "dependentPicklist", "restrictedPicklist", "inlineHelpText", "referenceTo", "relationshipName",
    "relationshipOrder", "defaultValue", "defaultValueFormula", "encrypted", "externalId", "nillable", "unique",
    "aggregatable", "aiPredictionField", "cascadeDelete", "compoundFieldName", "createable", "defaultedOnCreate",
    "deprecatedAndHidden", "displayLocationInDecimal", "extraTypeInfo", "filterable", "filteredLookupInfo", "groupable",
    "highScaleNumber", "htmlFormatted", "idLookup", "mask", "maskType", "nameField", "namePointing", "permissionable",
    "polymorphicForeignKey", "queryByDistance", "referenceTargetField", "restrictedDelete", "searchPrefilterable",
    "sortable", "updateable", "writeRequiresMasterRead", "soapType"
];

class DescribeResultParser{

    static parseListSobjects(listResult){

        if(listResult.status != 0){
            return {
                done: false,
                data: JSON.stringify({error: listResult.message})
            }
        }

        return {
            done: true,
            data: JSON.stringify({lists:listResult.result})
        }

    }

    static parse(describeResult){

        if(describeResult.status != 0){
            return {
                done: false,
                data: JSON.stringify({error: describeResult.message})
            };
        }

        const result = describeResult.result;
        const rows = [];

        result.fields.forEach((field) => {

            const row = Object.entries(field)
                        .sort(([a,],[b,]) => fields.indexOf(a) - fields.indexOf(b))
                        .filter(([k,v]) => fields.includes(k))
                        .map(([k,v]) => this.flatten([k,v]))
                        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

            rows.push(Object.values(row));
        })

        return{
            done: true,
            data: JSON.stringify({
                name: result.name,
                label: result.label,
                prefix: result.keyPrefix,
                header: fields,
                rows: rows,
            })
        };

    }

    static flatten([k,v]){

        if(k == "picklistValues"){
            const values = Array.from(v).map((obj) => obj["value"]).join("\n");
            return [k, values];
        }

        if(Array.isArray(v)){
            return [k, v.join("\n")];
        }

        return [k, v];
    }
}

module.exports = DescribeResultParser;