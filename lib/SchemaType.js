var Schema = require('./Schema.js');

var throwValidatorError = function(path, msg, value){
    throw new Error(path + " failed " + msg + " validation with value: " + value);
}

function SchemaType(path, options, instance, caster){
  this.path = path;
  this.instance = instance;
  this.validators = [];
  this.setters = [];
  this.getters = [];
  this.options = options;
  this.index = null;
  this.selected;

  this.cast = function cast(val){
    return caster(val);
  }
  
  if(options.default != undefined) this.default(options.default);
  if(options.set != undefined) this.set(options.set);
  if(options.get != undefined) this.get(options.get);
  if(options.select != undefined) this.selected = opt.select;
  if(options.required) this.isRequired = true;
  if(options.unique) this.isUnique = true;
  if(options.validate != undefined) this.validate(options.validate[0],options.validate[1]);
  if(options.index){
      this.index = {};
      if(options.projection) this.index.projection = options.projection;
      //TODO validate projections
  } 
}

SchemaType.prototype.set = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

SchemaType.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

SchemaType.prototype.applySetters = function (value){
    var v = value;
    for(var key in this.setters){
        v = this.setters[key](v);
    }
    
    v = this.cast(v);
    
    return v;
}

SchemaType.prototype.applyGetters = function (value){
    var v = value;
    for(var key in this.getters){
        v = this.getters[key](v);
    }
    
    return v;
}

SchemaType.prototype.default = function (val) {
    this.defaultValue = typeof val === 'function'
      ? val
      : this.cast(val);
    return this;
};

SchemaType.prototype.validate = function (obj, error) {
    this.validators.push([obj, error]);
    return this;
}

SchemaType.prototype.doValidate = function (value) {
    var path = this.path;
    
    this.validators.forEach(function (v) {
        var validator = v[0]
          , message   = v[1];

        if(!validator(value)){
            throwValidatorError(path,message,value);
        }
    });
};

SchemaType.prototype.prep = function(value){
    // Apply Setters and cast
    var v = this.applySetters(value);
    // Validate
    this.doValidate(v);
    return v;
}

module.exports = SchemaType;
