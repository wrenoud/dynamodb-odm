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
Schema.Types.Boolean = {
    name: 'Boolean',
    caster: Number,
    option_handler: function(self){
        // convert from number back to bool
        self.get(Boolean);
    }
};
Schema.Types.Date = {
    name: 'Date',
    caster: UTCDate,
    option_handler: function(self){
        // convert from timestamp back to Date Obj
        self.get(function(val){return new Date(val);});
    }
};
Schema.Types.DateArray = {
    name: 'DateArray',
    caster: DateArray,
    option_handler: function(self){
        // convert from timestamp back to Date Obj
        self.get(function(obj){
            var casted = []
            for(var index in obj){
                casted.push(new Date(obj[index]))
            }
            return casted;
        });
    }
};
Schema.Types.Number = {
    name: 'Number',
    caster: Number,
    option_handler: function(self){
        if(self.options.min != undefined){
            var minimum = self.options.min;
            self.validate(function(value){
                return value >= minimum
            },'min');
        }
        if(self.options.max != undefined){
            var maximum = self.options.max;
            self.validate(function(value){
                return value >= minimum
            },'min'
            );
        }
    }
};
Schema.Types.NumberArray = {
    name: 'NumberArray',
    caster: NumberArray,
    option_handler: function(self){}
};
Schema.Types.String = {
    name: 'String',
    caster: String,
    option_handler: function(self){
        // empty string validation, Amazon won't allow it
        self.validate(function(v){
            return v.length != 0;
        },'empty string');
        
        if(self.options.enum != undefined){
            var values = this.enumValues = self.options.enum;
            self.validate(function(v){
                return undefined === v || ~values.indexOf(v);
            }, 'enum');
        }
        if(self.options.lowercase) self.set(toLower);
        if(self.options.uppercase) self.set(toUpper);
    }
};
Schema.Types.StringArray = {
    name: 'StringArray',
    caster: StringArray,
    option_handler: function(self){}
};
Schema.Types.Object = {
    name: 'Object',
    caster: JSONObject,
    option_handler: function(self){
        self.get(function(val){return JSON.parse(val);});
    }
};


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
                return caster.name;
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

                var self = new SchemaType(path, opt, type, Schema.Types[type].caster);

                Schema.Types[type].option_handler(self);

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
