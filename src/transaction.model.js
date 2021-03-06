var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UploadTransaction = new Schema({
  requestMethod: {
    type: String,
    required: true,
  },
  storage_box_id: {
    type: String,
    required: true,
  },
  requestUri: {
    type: String,
    required: true,
  },
  requestBody: {
    type: String
  },
  authorization: {
    type: String
  },
  created: {
    type: Date,
    default: Date.now
  }
});

var DownloadTransaction = new Schema({
  storage_object_id: {
    type: String,
    required: true,
  },
  storage_box_id: {
    type: String,
    required: true,
  },
  fileName: {
    type: String
  },
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = function() {
  mongoose.model('UploadTransaction', UploadTransaction);
  mongoose.model('DownloadTransaction', DownloadTransaction);
};
