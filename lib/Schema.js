var SchemaType = require('./SchemaType');

function Schema(opt){
    this.paths = {};
    this.selected = [];
    this.unselected = [];
    this.required = [];
    this.unique = [];
    this.indexes = [];

    for(var path in opt){
        this.paths[path] = new SchemaPath(path, opt[path]);

        if(this.paths[path].isRequired){
            this.required.push(path);
        }
        if(this.paths[path].isUnique){
            this.unique.push(path);
        }
        if(this.paths[path].selected != undefined){
            if(this.paths[path].selected){
                this.selected.push(path);
            }else{
                this.unselected.push(path);
            }
        }
        if(this.paths[path].index){
            this.indexes.push(path);
        }
    }
}

Schema.prototype.prep = function(item){
    this.required.forEach(function(path){
        if(item[path] == undefined){
            throw new Error("Required path ("+path+") is not set.");
        }
    });
    
    // apply setters and validate
    for(var path in item){
        // Apply Setters and cast
        // Validate
        if(this.paths[path] != undefined)
            item[path] = this.paths[path].prep(item[path]);
        else
            throw new Error("Undefined document attribute { " + path +" : " + item[path] + " }");
    }
    return item;
}

Schema.prototype.applyGetters = function(item){
    var returnItem = {}
    for(var path in item){
        if(this.paths[path] != undefined){
            returnItem[path] = this.paths[path].applyGetters(item[path]);
        }else{
            throw new Error("Undefined document attribute { " + path +" : " + item[path] + " }");
        }
    }
    return returnItem;
}

/*******************************************************************************
 * Type Declarations
 ******************************************************************************/

var StringArray = function StringArray(obj){
    var casted = new Array();

    if(obj != undefined){
        if(Array.isArray(obj)){
            for(var key in obj){
                casted.push(String(obj[key]));
            }
        }else{
            // maybe they just forgot to cast as an array, lets be nice
            casted.push(String(obj));
        }
    }
    return casted;
}

var NumberArray = function NumberArray(obj){
    var casted = new Array();

    if(obj != undefined){
        if(Array.isArray(obj)){
            for(var key in obj){
                casted.push(Number(obj[key]));
            }
        }else{
            // maybe they just forgot to cast as an array, lets be nice
            casted.push(Number(obj));
        }
    }
    return casted;
}

var UTCDate = function UTCDate(val){
    return new Date(val).valueOf()
}

var DateArray = function DateArray(obj){
    var casted = new Array();

    if(obj != undefined){
        if(Array.isArray(obj)){
            for(var key in obj){
                casted.push(UTCDate(obj[key]));
            }
        }else{
            // maybe they just forgot to cast as an array, lets be nice
            casted.push(UTCDate(obj));
        }
    }
    return casted;
}

var JSONObject = function(obj){
    return JSON.stringify(obj);
}

// Supported Types
Schema.Types = {};
Schema.Types.Boolean = Number;
Schema.Types.Date = UTCDate;
Schema.Types.DateArray = DateArray;
Schema.Types.Number = Number;
Schema.Types.NumberArray = NumberArray;
Schema.Types.String = String;
Schema.Types.StringArray = StringArray;
Schema.Types.Object = JSONObject;


/*******************************************************************************
 * Setters
 ******************************************************************************/

 // String Setters
var toLower = function toLower (v) {
    return v.toLowerCase();
}
var toUpper = function toUpper (v) {
    return v.toUpperCase();
}

/*******************************************************************************
 * Validators
 ******************************************************************************/
 
 
 /*******************************************************************************
 * Type determination
 ******************************************************************************/

var typeofcaster = function(caster){
    switch(typeof caster){
        case 'function':
            return caster.name;
            break;
        case 'object':
            if (Array.isArray(caster) && caster.length == 1 && typeof caster[0] == 'function'){
                return caster[0].name + "Array";
            }else{
                return undefined;
            }
            break;
        default:
            return undefined;
    }
}

var SchemaPath = function(path, opt){
    var throwTypeError = function(path){
        throw new Error("Unsupported Schema Type for: " + path);
    }
    
    if(typeof opt == 'function'){
        // hopefully they were just using the shorthand, lets try again
        return new SchemaPath(path, {type:opt});
    }else if(typeof opt == 'object'){
        if(Array.isArray(opt)){
            // this is an array type
            return new SchemaPath(path, {type:opt});
        }else if(opt.type){
            // ok, finally, a legitimate option object
            
            // now lets figure out the type and make sure it's supported
            var type = typeofcaster(opt.type);

            if(type && Schema.Types[type]){

                var self = new SchemaType(path, opt, type, Schema.Types[type]);

                switch(Schema.Types[type]){
                    
                    case Schema.Types.String:
                        // empty string validation, Amazon won't allow it
                        self.validate(function(v){
                            return v.length != 0;
                        },'empty string');
                        
                        if(opt.enum != undefined){
                            var values = this.enumValues = opt.enum;
                            self.validate(function(v){
                                    return undefined === v || ~values.indexOf(v);
                                }, 'enum'
                            );
                        }
                        if(opt.lowercase) self.set(toLower);
                        if(opt.uppercase) self.set(toUpper);
                        break;
                    
                    case Schema.Types.Number:
                        if(opt.min != undefined){
                            var minimum = opt.min;
                            self.validate(function(value){
                                    return value >= minimum
                                },'min'
                            );
                        }
                        if(opt.max != undefined){
                            var maximum = opt.max;
                            self.validate(function(value){
                                    return value >= minimum
                                },'min'
                            );
                        }
                        break;
                        
                    case Schema.Types.Boolean:
                        // convert from number back to bool
                        self.get(Boolean);
                        break;
                        
                    case Schema.Types.Date:
                        // convert from timestamp back to Date Obj
                        self.get(function(val){return new Date(val);});
                        break;
                        
                    case Schema.Types.DateArray:
                        // convert from timestamp back to Date Obj
                        self.get(function(obj){
                            var casted = []
                            for(var index in obj){
                                casted.push(new Date(obj[index]))
                            }
                            return casted;
                        });
                        break;

                    case Schema.Types.Object:
                        self.get(function(val){return JSON.parse(val);});
                        break;
                        
                    default:
                }
                return self;
            }else{
                throwTypeError(path);
            }
            
        }else{
            throwTypeError(path);
        }
    
    }
}

module.exports = Schema;
