dynamodb-odm
============

Example Usage
-------------

```JavaScript
var dynamodb = require('dynamodb-odm');
var Schema = dynamodb.Schema;

dynamodb.connect({
        accessKeyId: '*************',
        secretAccessKey: '*************',
        endpoint: 'dynamodb.us-west-2.amazonaws.com'
    }, 'test_');

var DogOwnerSchema = new Schema({
    owner: {type: String, required: true, lowercase: true},
    dog: String
});

var DogOwner = dynamodb.model("DogOwner",{hash: 'owner', range: 'dog'}, {}, DogOwnerSchema);

// make the table on Amazon
DogOwner.create();

var NewDogOwner = new DogOwner({owner:'George', dog:'Bailey'});

NewDogOwner.save();

```


Schema
--------------------------------------------------------------------------

The Schema definitions are very similar to the mongoose semantics, except there is no support for sub-attributes. Although an attribute can be specified as an `Object` type which will serialize the attribute value.

**Supported Attribute Types**

* Boolean
* Date - stored as UNIX timestamp in DynamoDB, but converted to JavaScript Date Object
* DateArray
* Number
* Boolean - native JavaScript type, stored as number in DynamoDB
* NumberArray
* String
* StringArray
* Object - A JSON object, this is serialized

**Default Attribute Options**

* `set` - a function to be called on the attribute value before casting and validation on save, insert or update
* `get` - a function to be called on the attribute value after querying the database
* `validate` - a function and description for validation `[function(val){}, description]`, function should take one parameter and return Boolean, this is called last before storing in database
* `default` - a function or value to set the attribute if not set
* `required` - (Boolean) flag to indicate that the attribute must be set before save or insert
* `select` - (Boolean) flag to indicate if the attribute should be selected by default, ignored for querys
* `index` - (Boolean) flag to indicate making the attribute a LSI range
* `projection` - (Array) list of projected attribute names to include in the LSI table, ignored if `index` is unset or false

**Special Options**

*String*

* `lowercase` - (Boolean) convert all value to lowercase
* `uppercase` - (Boolean) convert all value to uppercase
* `enum` - (Array) a list of possible values, applied as a validator

*Number*

* `min` - (Number) value must be greater than or equal
* `max` - (Number) value must be less than or equal
 
*Object*

* `compress` - (Boolean) indicates the object should be compressed after serialization (*to be implemented*)

### Custom Attribute Type ###

If you have several similar attributes that have shared setters/getters/validators it might be easiest to define it as a custom type.

Keep in mind that all attributes must be cast as a String or Number (or array of either) to be stored in DynamoDB, but you can use a getter to convert it back to your desired type. This is how Boolean, Date, DateArray and Object are supported.

Here is an example showing how to attach setter, getter, or validator functions (see the attribute option descriptions for set, get and validate above for an explaination of what they do).

```JavaScript
dynamodb.Schema.Types.myType = {
    name: 'myType',
    caster: String,
    option_handler: function(self){
        // default options
        self.set(function(val){
            // alter value
            return altered_value;
        });
        self.get(function(val){
            // alter value
            return altered_value;
        });
        self.validate(
            function (val){
                // some condition the value must meet
                return conditional;
            },
            "Text description of validation"
        );

        // handle options specified in schema
        if(self.options.lowercase){
            self.set(function(val){
                return val.toLowerCase();
            });
        }
    }
}
```

Model Methods
--------------------------------------------------------------------------------

* `create` - creates the DynamoDB table
* `update` - updates attributes for a given hashKey
* `getItem` (`findOneById`) - gets an item by hash and range
* `query` (`find`) - queries a hash bucket on range or LSI


### `Model.create(throughput, callback)` ###

High level wrapper for [DynamoDB API method CreateTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html). Creates the DynamodDB table based on the model schema definition.

**Note**

The table will *not* be avaliable imediately and can take up to a minute to initialize.

#### Parameters ####

`throughput` - `{write: X, read: Y}` default is `{read:2, write:1}`
`callback` - function(err, tableDetails) err is set if an error occured

### `Model.update(conditions, updates, callback)` ###

Updates selected attributes of a document. This is a high level wrapper on the [DynamoDB API method UpdateItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html).This is similar to the mongoose sematics but unlike mongoose the middleware (setters, validation) is applied because some of the attribute types, while native to JavaScript, are DynamoDB pseudo-types that have to be cast to the DynamoDB supported types.

#### Parameters ####

`conditions` - the hash and range of the document to be updated, i.e. `{id:1234,username:'george'}`

`updates` - a dictionary of attributes and updated values or action and sub-dictionary and attribute/value
i.e

>```JavaScript
{
    last_login: Date.now(),
    $add: { succesful_logins: 1 }
}
>```
> **Supported Actions**
>* `$put` (`$set`) - inserts or replaces attribute value, this is the default action
>* `$add` (`$inc`) - this is an atomic update that will add the value to the attributes current value, if the attribute doesn't exist it will set it to 0 and increment from there.
>* `$del` - deletes the attribute

`callback` - `function(err,res,cap)` err will be null if the call completed succesfully. Otherwise it can be a AWS API error, validation error, or 'Undefined document attribute' if trying to update an attribute not included in the schema. Currently sucessful responses returns no data, but the API supports various returned data.


### `Model.getItem(conditions, options, callback)` ###

*Alternate method name:* `Model.findOneById()`

Wraps the [DynamoDB API method GetItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)

#### Parameters ####

`conditions` - the hash and range of the document to be updated, i.e. `{id:1234,username:'george'}`

`options` - `{attributesToGet, consistentRead}` see API method documentation for description

`callback` - `function(err,res,cap)` err will be null if the call completed succesfully. Otherwise it can be a AWS API error.


### `Model.query(conditions, options, callback)` ###

*Alternate method name:* `Model.find()`

Queries the table based on the hash and range or LSI and condition. Wraps [DynamoDB API method Query](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html).

**Note**

The option `indexName` does not have to be specified if using an LSI index specified in the schema.

#### Parameters ####

`conditions` - the hash, and range or LSI and condition of the documents to be found, i.e.

>```JavaScript
{
    forum_id:12,
    comments: {GT:5}
}
>```
> **Supported conditions**
>
> EQ | LE | LT | GE | GT | BEGINS_WITH | BETWEEN
>
> For detailed descriptions see the [API method documentation](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-KeyConditions)

`options` - `{attributesToGet, limit, consistentRead, count, scanIndexForward, exclusiveStartKey, indexName}` see API method documentation for description

`callback` - `function(err,res,cap)` err will be null if the call completed succesfully. Otherwise it can be a AWS API error.


Model Instance (Document) Methods
----------------------

* `save(callback)` - replaces or inserts document
* `insert(callback)` - same as `save` but fails with error 'ConditionalCheckFailedException' if the hash and range aren't unique.
