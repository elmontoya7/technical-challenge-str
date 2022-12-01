// libraries
var mongoose = require('mongoose');
const { SoftDelete } = require('soft-delete-mongoose-plugin')

//Set up default mongoose connection
var mongoDB = 'mongodb://mongo:27017/stori-challenge'

// configure soft delete
mongoose.plugin(
  new SoftDelete({
    isDeletedField: 'is_deleted',
    deletedAtField: 'deleted_at'
  }).getPlugin()
)

// connect to db
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Mongo connected');
});

module.exports = db