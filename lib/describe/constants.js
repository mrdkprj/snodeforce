module.exports = {
	keyOrder: ["label","name","type","referenceTo",
							"length","picklistValues","picklistLabels",
							"calculatedFormula","autoNumber","externalId","calculated",
							"digits","scale","precision","custom","unique",
							"caseSensitive","nillable","inlineHelpText",
							"defaultValueFormula"],

	includKey: ["label","name","type","referenceTo","length","picklistValues",
				"picklistLabels","calculatedFormula","autoNumber","externalId",
				"custom","unique","caseSensitive","nillable","inlineHelpText","defaultValueFormula"],

	typeMapping: {
		"id": {
			"label": "ID",
			"type": "string"
		},
		"address": {
			"label": "Address",
			"type": "string"
		},
		"anytype": {
			"label": "AnyType",
			"type": "string"
		},
		"base64": {
			"label": "Base64",
			"type": "string"
		},
		"email": {
			"label": "Email",
			"type": "string"
		},
		"phone": {
			"label": "Phone",
			"type": "string"
		},
		"combobox": {
			"label": "Combobox",
			"type": "string"
		},
		"encryptedstring": {
			"label": "Encrypted String",
			"type": "string"
		},
		"string": {
			"label": "Text",
			"type": "string"
		},
		"textarea": {
			"label": "Textarea",
			"type": "string"
		},
		"url": {
			"label": "URL",
			"type": "string"
		},
		"time": {
			"label": "Time",
			"type": "string"
		},
		"boolean": {
			"label": "Checkbox",
			"type": ""
		},
		"date": {
			"label": "Date",
			"type": ""
		},
		"datetime": {
			"label": "Datetime",
			"type": ""
		},
		"picklist": {
			"label": "Picklist",
			"type": ""
		},
		"multipicklist": {
			"label": "Multipicklist",
			"type": ""
		},
		"reference": {
			"label": "Reference",
			"type": ""
		},
		"int": {
			"label": "Number",
			"type": "integer"
		},
		"currency": {
			"label": "Currency",
			"type": "double"
		},
		"double": {
			"label": "Number",
			"type": "double"
		},
		"percent": {
			"label": "Percent",
			"type": "double"
		},
		"auto_number": {
			"label": "Auto Number",
			"type": "string"
		},
		"formula": {
			"label": "Formula",
			"type": ""
		},
		"external_id": {
			"label": "External Id",
			"type": "string"
		}
	}
}