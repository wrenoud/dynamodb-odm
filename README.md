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

Supported Types

* Boolean
* Date
* DateArray
* Number
* Boolean
* NumberArray
* String
* StringArray
* Object

Default Options

* set
* get
* default
* required
* select

Special Options

String

>* lowercase
>* uppercase
>* enum

Number

>* min
>* max
