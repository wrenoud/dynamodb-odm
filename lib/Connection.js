var dynamodb = require('dynamodb');

function Connection(){
    this.tablePrefix
    this.options = null;
    this.collections = [];
    this.db = null;
}

Connection.prototype.connect = function(opt, prefix, callback){
//    this.emit('connecting');
    
    if(prefix != undefined){
        this.tablePrefix = prefix;
    }
    this.options = opt;
    this.db = dynamodb.ddb(opt);
    
    var listTableOptions;
    if(this.tablePrefix){
        listOptions = { exclusiveStartTableName: this.tablePrefix };
    }else{
        listOptions = {};
    }
    
    this.db.listTables(listOptions, function(err,res){
        if(!err){
            this.collections = res.TableNames;
            if(callback) callback(null, res);
        }else{
            if(callback) callback(err);
            else throw err;
        }
    });
};

Connection.prototype.tableName = function(table){
    return this.tablePrefix + table;
}

Connection.prototype.createTable = function(table, hash, localSecondaryIndexes, _throughput, callback){
    var tableName = this.tableName(table);
    
    var throughput = {read: 2, write: 1}; // defaults
    
    if(_throughput){
        if(_throughput.read) throughput.read = _throughput.read;
        if(_throughput.write) throughput.write = _throughput.write;
    }
    
    this.db.createTable(tableName, hash, localSecondaryIndexes, throughput, function(err,res){
        if(err){
            if(callback) callback(err);
            else throw err;
        }else{
            if(callback) callback(null, res);
            else throw err;
        }
    });
}

Connection.prototype.putItem = function(table, item, restrictions, callback){
    var tableName = this.tableName(table);

    this.db.putItem(tableName, item, restrictions, callback);

}

Connection.prototype.updateItem = function(table, key, updates, options, callback){
    var tableName = this.tableName(table);
    
    this.db.updateItem(tableName, key, updates, options, callback);
}

Connection.prototype.getItem = function(table, key, options, callback){
    var tableName = this.tableName(table);
    
    this.db.getItem(tableName, key, options, callback);
}

Connection.prototype.batchGetItem = function(){}

Connection.prototype.query = function(table, hash, options, callback){
    var tableName = this.tableName(table);
    
    this.db.query(tableName, hash, options, callback);
}

module.exports = Connection;
