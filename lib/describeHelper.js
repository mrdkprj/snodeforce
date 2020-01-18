module.exports = {

    parseDescribeResult: function (result) {
        const keyOrder = ["label","name","type","reference_to",
        "length","picklist_values","picklist_lables",
        "calculated_formula","auto_number","external_id","calculated",
        "digits","scale","precision","custom","unique",
        "case_sensitive","nillable","inline_help_text",
        "default_value_formula"];

        const Exclude_header = ["byte_length"," creatable"," defaulted_on_create",
            "deprecated_and_hidden"," filterable"," groupable",
            "id_lookup","name_field"," name_pointing"," restricted_picklist",
            "soap_type"," sortable"," updateable","calculated",
            "digits"," scale"," precision"]

        function format_result(field_result){
            Array[field_result].flatten.each{ |hash| convert_result(hash) }.map{|hash| hash.slice(*Key_order)}
                        .map{|hash| hash.reject{|k,v| Exclude_header.include?(k) } }
        }

        function convert_result(raw_hash){

            add_missing_key(raw_hash)

            map_key = raw_hash[:type].to_sym
            if @type_mapping.has_key?(map_key)
                type = get_type(raw_hash, @type_mapping[map_key][:label])
                length = get_length(raw_hash, @type_mapping[map_key][:type])
            else
                type = raw_hash[:type]
                length = nil
            end

            if raw_hash[:type] == "picklist"
                picklist_values = raw_hash[:picklist_values]
                raw_hash[:picklist_values] = get_picklist_values(picklist_values)
                raw_hash[:picklist_lables] = get_picklist_labels(picklist_values)
            end

            raw_hash[:type] = type
            raw_hash[:length] = length

            raw_hash
        }

        function get_picklist_values(picklist_values){

            const values = ""

            if (picklist_values.is_a(Array)){
                values = picklist_values.map{ |hash| hash[:value]}
            }

            if(picklist_values.is_a(Hash)){
                values = [picklist_values[:value]]
            }

            values.join("\n")
        }

        function get_picklist_labels(picklist_values){

            labels = ""

            if picklist_values.is_a?(Array)
                labels = picklist_values.map{ |hash| hash[:label]}
            end

            if picklist_values.is_a?(Hash)
                labels = [picklist_values[:label]]
            end

            labels.join("\n")
        }

        function add_missing_key(raw_hash){

            if !raw_hash.has_key?(:reference_to)
                raw_hash.store(:reference_to, nil)
            end

            if !raw_hash.has_key?(:calculated_formula)
                raw_hash.store(:calculated_formula, nil)
            end

            if !raw_hash.has_key?(:external_id)
                raw_hash.store(:external_id, nil)
            end

            if !raw_hash.has_key?(:picklist_values)
                raw_hash.store(:picklist_values, nil)
            end

            if !raw_hash.has_key?(:picklist_lables)
                raw_hash.store(:picklist_lables, nil)
            end

            if !raw_hash.has_key?(:inline_help_text)
                raw_hash.store(:inline_help_text, nil)
            end

            if !raw_hash.has_key?(:default_value_formula)
                raw_hash.store(:default_value_formula, nil)
            end

            raw_hash
        }

        function get_type(raw_hash, raw_type_name){

            if raw_hash[:auto_number]
                return @type_mapping[:auto_number][:label]
            end

            if raw_hash[:calculated]
                return @type_mapping[:formula][:label] + "(" + raw_type_name + ")"
            end

            return raw_type_name
        }

        function get_length(raw_hash, data_type){

            if data_type == "string"
                return raw_hash[:length].to_s;
            end

            if data_type == "integer"
                return raw_hash[:digits].to_s + ',0';
            end

            if data_type == "double"
                precision = raw_hash[:precision]
                scale = raw_hash[:scale]
                size = precision.to_i - scale.to_i
                return size.to_s + ',' + scale.to_s
            end

            nil
        }
    }
}