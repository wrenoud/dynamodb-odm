var Schema = require('./Schema.js');

var index_suffix = '-index';

var Model = function Model(name, hashKey, schema, connection){
    function instance(data){
        this.data = data;

        // populate the default values
        for(var key in schema.paths){
            var path = schema.paths[key];
            if(path.defaultValue != undefined && ((this.data && this.data[key] == undefined) || this.data == undefined)){
                if(typeof path.defaultValue == 'function'){
                    this.data[key] = path.defaultValue();
                }else{
                    this.data[key] = path.defaultValue;
                }
            }
        }
    }
    
    instance.prototype.connection = instance.connection = connection;
    instance.prototype.modelName = instance.modelName = name;
    
    instance.prototype.hash = instance.hash = hashKey.hash;
    if(!~schema.required.indexOf(hashKey.hash)) schema.required.push(hashKey.hash);
    
    if(hashKey.range != undefined){
        instance.range = hashKey.range;
        instance.prototype.range = hashKey.range;
        if(!~schema.required.indexOf(hashKey.range)) schema.required.push(hashKey.range);
    }
    instance.prototype.schema = instance.schema = schema;
    
    /**
     * Saves document (Upsert)
     * 
     * @param callback a function(err,res,cap)
     * @param _dynamodb_options an internal parameter for supporting inserts (see insert code)
     */
    instance.prototype.save = function(callback, _dynamodb_options){
        // apply setters and validation
        var data = this.data;
        
        try{
            data = this.schema.prep(data);
        }
        catch(err){
            if(callback) callback(err);
            else throw err;
            return;
        }
        
        if(!_dynamodb_options) var _dynamodb_options = {};
        
        // looks good
        this.connection.putItem(this.modelName, data, _dynamodb_options, function(err,res,cap){
            if(err){
                if(callback) callback(err, res, cap);
                return;
            }else{
                // no errors...
                if(callback) callback(err, res, cap);
                return;
            }
        });
        
        
    };
    
    /**
     * Insert the document into the table
     * 
     * Fails with error 'ConditionalCheckFailedException' if the hash and
     * range aren't unique.
     * 
     * @param callback a function(err,res,cap)
     */
    instance.prototype.insert = function(callback){
        var options = { expected: {} };
        options.expected[this.hash] = { exists: false };
        if(this.range){
            options.expected[this.range] = { exists: false };
        }
        
        this.save(callback, options);
    };
    
    /**
     * Update document
     * 
     * This is for updating a document and follows the mongoose sematic
     * but unlike mongoose the middleware (setters, validation) is applied
     * because some of the attribute types are pseudo types that have to be
     * cast
     * 
     * @param conditions a dictionary of the hash and range names and the key values
     * @param updates either a dictionary of updates {price: 10} or action and updates {$add:{price:1}}
     * @param callback a function(err,res,cap)
     */
    instance.update = function(conditions, updates, callback){
        var schema = this.schema;
        var prepared_updates = {};
        var key = {};
        
        function prep_update(path, value, action){
            if(schema.paths[path] != undefined){
                return {value: schema.paths[path].prep(value), action: action};
            }else{
                throw Error("Undefined document attribute { " + path +" : " + value + " }");
            }
        }

        try{
            for(var path in updates){
                switch(path){
                    case '$set':
                    case '$put':
                        for(var subpath in updates[path]){
                            prepared_updates[subpath] = prep_update(subpath, updates[path][subpath], 'PUT');
                        }
                        break;
                    case '$inc':
                    case '$add':
                        for(var subpath in updates[path]){
                            prepared_updates[subpath] = prep_update(subpath, updates[path][subpath], 'ADD');
                        }
                        break;
                    case '$del':
                        for(var subpath in updates[path]){
                            prepared_updates[subpath] = {action: 'DEL'};
                        }
                        break;
                    default:
                        // apply path prep to the value
                        prepared_updates[path] = prep_update(path, updates[path], 'PUT');
                }
            }

            key[this.hash] = schema.paths[this.hash].prep(conditions[this.hash]);
            if(conditions[this.range]){
                key[this.range] = schema.paths[this.range].prep(conditions[this.range]);
            }
        }
        catch(err){
            if(callback) callback(err);
            else throw err;
            return;
        }
        
        this.connection.updateItem(this.modelName, key, prepared_updates, {}, function(err,res,cap){
            if(err){
                if(callback) callback(err, res, cap);
                return;
            }else{
                // no errors...
                if(callback) callback(err, res, cap);
                return;
            }
        });
        
    };

    instance.getItem = function(conditions, options, callback){
        // apply setters and validation
        var schema = this.schema;
        var key = {};
        
        try{
            key[this.hash] = schema.paths[this.hash].prep(conditions[this.hash]);
            if(conditions[this.range]){
                key[this.range] = schema.paths[this.range].prep(conditions[this.range]);
            }
        }
        catch(err){
            if(callback) callback(err);
            else throw err;
            return;
        }
        this.connection.getItem(this.modelName, key, options, function(err,res,con){
            if(err){
                callback(err);
            }else{
                res = schema.applyGetters(res);
                callback(null,res,con);
            }
        })
    };
    instance.findOneById = instance.getItem;
    
    instance.batchGetItem = function(){};
    
    /**
     * Query database
     * 
     * @param hash a dictionary with the hash and value, and optionally range or LSI with value or comparision {'EQ':10}
     * @param options {attributesToGet, limit, consistentRead, count, 
     *                 scanIndexForward, exclusiveStartKey, indexName}
     */
    instance.query = function(conditions, options, callback){
        var schema = this.schema;
        var prepared_hash = {}
        for(var path in conditions){
            if(path != this.hash && path != this.range){
                // it's a LSI, we need to tell AWS we're querying on an index
                options.indexName = path + index_suffix;
            }
            // need to apply casters to values for type not supported by dynamodb
            if(typeof conditions[path] === 'object'){
                for(var cond in conditions[path]){
                    // if there is a condition we have to dive into the object
                    prepared_hash[path] = {};
                    prepared_hash[path][cond] = schema.paths[path].cast(conditions[path][cond]);
                }
            }else{
                prepared_hash[path] = schema.paths[path].cast(conditions[path]);
            }
        }
        this.connection.query(this.modelName, conditions, options, function(err,res,con){
            if(err){
                callback(err);
            }else{
                var items = res.items;
                res.items = [];
                items.forEach(function(obj){
                    res.items.push(schema.applyGetters(obj));                    
                });
                callback(null,res,con);
            }
        });
    };
    instance.find = instance.query;

    // create the table
    instance.create = function(throughput, callback){
        var connection = this.connection;
        var paths = this.schema.paths;
        function convertType(type){
            // returns the appropriate dynamodb type
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
                case 'NumberArray':
                case 'DateArray':
                    return connection.db.schemaTypes().number_array;
                case 'StringArray':
                    return connection.db.schemaTypes().string_array;
                default:
            }
        }
        
        if(paths[this.hash]){
            var hash = {hash: [
                this.hash,
                convertType(paths[this.hash].instance)
            ]};
        
            if(this.range && paths[this.range]){
                hash.range = [
                    this.range,
                    convertType(paths[this.range].instance)
                ]
            }
            // lets handle the LSIs
            var lsi = null;
            if(this.schema.indexes.length > 0){
                lsi = {};
                this.schema.indexes.forEach(function(path){
                    var indexName = path + index_suffix;
                    lsi[indexName] = {
                        AttributeName: path,
                        AttributeType: convertType(paths[path].instance),
                    }
                    if(paths[path].index.projection){
                        lsi[indexName].Projection = paths[path].index.projection;
                    }
                });
            }
            
            this.connection.createTable(this.modelName, hash, lsi, throughput, callback);
        }else{
            var err = new Error("Hash ("+ this.hash + ") not in Model: " + this.modelName);
            if(callback) callback(err);
        }
    }
    return instance;
}


module.exports = Model;
