var Schema = require('./Schema.js');
var Connection = require('./Connection.js');
var Model = require('./Model.js');

function DynamoDB () {
  this.connection = {};
  this.models = {};
  this.modelSchemas = {};
  this.options = {};
};

DynamoDB.prototype.connect = function(opt, prefix){
    this.connection = new Connection();
    this.connection.connect(opt, prefix, function(err){});
};

DynamoDB.prototype.model = function(name, hashKey, schema){
    this.models[name] = new Model(name, hashKey, schema, this.connection);
    this.modelSchemas[name] = schema;
    
    var model = this.models[name];
    
    return model;
}

DynamoDB.prototype.Schema = Schema;
DynamoDB.prototype.Connection = Connection;
DynamoDB.prototype.Model = Model;

var dynamodb = module.exports = exports = new DynamoDB;
