var Schema = require('./Schema.js');

var Model = function Model(name, hashKey, lsi, schema, connection){
    function instance(data){
        this.data = data;

        // populate the default values
        for(var key in schema.paths){
            var path = schema.paths[key];
            if(path.defaultValue != undefined && this.data[key] == undefined){
                if(typeof path.defaultValue == 'function'){
                    this.data[key] = path.defaultValue();
                }else{
                    this.data[key] = path.defaultValue;
                }
            }
        }
    }
    
    instance.prototype.connection = instance.connection = connection;
    instance.prototype.modelName = instance.modelName = name;;
    
    instance.prototype.hash = instance.hash = hashKey.hash;
    if(!~schema.required.indexOf(hashKey.hash)) schema.required.push(hashKey.hash);
    
    if(hashKey.range != undefined){
        instance.range = hashKey.range;
        instance.prototype.range = hashKey.range;
        if(!~schema.required.indexOf(hashKey.range)) schema.required.push(hashKey.range);
    }
    instance.prototype.lsi = instance.lsi = lsi;
    instance.prototype.schema = instance.schema = schema;
    
    /**
     * Saves document (Upsert)
     */
    instance.prototype.save = function(callback, dynamodb_options){
        // confirm required attributes are set
        var data = this.data;
        
        console.log(data);
        
        try{
            data = this.schema.prep(data);
        }
        catch(err){
            if(callback) callback(err);
            else throw err;
            return;
        }
        
        console.log(__filename + data);
        
        if(!dynamodb_options) var dynamodb_options = {};
        
        // looks good
        this.connection.putItem(this.modelName, data, dynamodb_options, function(err,res,cap){
            if(err){
                console.log(err);
                if(callback) callback(err);
                return;
            }else{
                console.log(err,res,cap);
                // no errors...
                if(callback) callback(undefined, res);
                return;
            }
        })
        
        
    };
    
    instance.prototype.insert = function(callback){
        // make sure that we're not overwriting
        var options = { expected: {} };
        options.expected[this.hash] = { exists: false };
        if(this.range) options.expected[this.range] = { exists: false };
        
        this.save(callback, options);
        
    };
    
    instance.prototype.update = function(callback){
        // make sure that we're not overwriting
        var options = { expected: {} , returnValues: 'ALL_OLD'};
        options.expected[this.hash] = { exists: true, value: this.data[this.hash] };
        if(this.range){
            options.expected[this.range] = {
                exists: true,
                value: this.data[this.range]
            };
        }
        
        console.log(options);
        
        this.save(callback, options);
        
    };

    // create the table
    instance.create = function(){
        var connection = this.connection;
        function convertType(type){
            switch(type){
                case 'Boolean':
                case 'Date':
                case 'Number':
                    return connection.db.schemaTypes().number;
                    break;
                case 'String':
                case 'Object':
                    return connection.db.schemaTypes().string;
                    break;
                default:
            }
        }
        
        if(this.schema.paths[this.hash]){
            var hash = {hash: [
                this.hash,
                convertType(this.schema.paths[this.hash].instance)
            ]};
        
            if(this.range && this.schema.paths[this.range]){
                hash.range = [
                    this.range,
                    convertType(this.schema.paths[this.range].instance)
                ]
            }
            
            this.connection.createTable(this.modelName, hash);
        }else{
            throw new Error("Hash ("+ this.hash + ") not in Model: " + this.modelName)
        }
//            
//        )
//        
//        ddb.createTable('foo', { hash: ['id', ddb.schemaTypes().string],
//                         range: ['time', ddb.schemaTypes().number] },
//                {read: 2, write: 1}, function(err, details) {});
    }
    return instance;
}


module.exports = Model;
