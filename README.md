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
 
Model
-----

**Methods**

* `create` - creates the DynamoDB table
* `update` - updates attributes for a given hashKey
* `getItem` (`findOneById`) - gets an item by hash and range
* `query` (`find`) - queries a hash bucket on range or LSI
