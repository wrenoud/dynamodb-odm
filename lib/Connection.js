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
            console.log(res);
        }else{
            console.log(err);
        }
        callback(err);
    });
};

Connection.prototype.tableName = function(name){
    return this.tablePrefix + name;
}

Connection.prototype.createTable = function(name, hash, _throughput, callback){
    var tableName = this.tableName(name);
    
    var throughput = {read: 2, write: 1}; // defaults
    
    if(_throughput){
        if(_throughput.read) throughput.read = _throughput.read;
        if(_throughput.write) throughput.write = _throughput.write;
    }
    
    this.db.createTable(tableName, hash, throughput, function(err,res){
        if(callback) callback(err,res);
        else{
            if(!err) console.log(res);
            else console.log(err);
        }
    });
}

Connection.prototype.putItem = function(name, item, restrictions, callback){
    var tableName = this.tableName(name);

    this.db.putItem(tableName, item, restrictions, callback);

}

Connection.prototype.getItem = function(){

}

module.exports = Connection;
