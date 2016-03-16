var express = require('express');
var router = express.Router();
var path = require('path');
var conf = require('./config/config').getConfig();
var mongoose = require('mongoose');
var fetch = require('isomorphic-fetch');
var uuid = require('uuid');
var passport = require('passport');

var swiftInitializer = require('./services/swiftInitializer.js');

var UploadTransaction = mongoose.model('UploadTransaction');
var DownloadTransaction = mongoose.model('DownloadTransaction');

var upload = function(req, res, next) {
  var transaction = req.transaction;
  transaction.remove();

  var fileUploaded = {
    storage_object_id: uuid.v4(),
    storage_box_id: transaction.storage_box_id,
  };

  swiftInitializer.init(function(err, swift) {

    if (err) {
      return next(err);
    }
    swift.createObject(fileUploaded.storage_box_id, fileUploaded.storage_object_id, function(err, ret) {
      if (err || ret.statusCode !== 201) {
        return next(err);
      }

      swift.retrieveObjectMetadata(fileUploaded.storage_box_id, fileUploaded.storage_object_id, function(err, ret) {
        if (err || ret.statusCode !== 200) {
          return next(err);
        }

        // req now has openStack info
        fileUploaded.contentType = ret.headers['content-type'];
        fileUploaded.size = ret.headers['content-length'];
        fileUploaded.name = req.openstack.fileName;
        fileUploaded.etag = ret.headers.etag;

        req.fileUploaded = fileUploaded;
        next();
      });
    }, req);
  });
};

var uploadCallback = function(req, res, next) {
  var transaction = req.transaction.toObject();
  var file = req.fileUploaded;
  res.status(302)
    .set('Location', transaction.requestUri)
    .send({
      callbackBody: transaction.requestBody,
      file: file
    });

  // fetch(transaction.requestUri, {
  //     method: transaction.requestMethod,
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json',
  //       'Authorization': transaction.authorization
  //     },
  //     body: JSON.stringify({
  //       callbackBody: transaction.requestBody,
  //       file: file
  //     })
  //   })
  //   .then(function(response) {
  //     console.log(response.status);
  //     if (response.status >= 200 && response.status < 300) {
  //       return response.json();
  //     }
  //     if (response.status === 301 || response.status === 302) {
  //       var location = response.getHeader('Location');
  //       console.log(location);
  //       res.set('Location', location);
  //     }
  //     return res.status(response.status).send(response.body);
  //   })
  //   .then(function(json) {
  //     res.status(201).json(json);
  //   })
  //   .catch(function(err){
  //     return response.text();
  //     res.status(415).send('Your callback should return json string, but you return ' + response.body);
  //   });
};

var download = function(req, res, next) {
  var transaction = req.transaction;
  transaction.remove();

  if (transaction.fileName) {
    var encodedFileName = encodeURIComponent(transaction.fileName);
    var content_disposition = 'attachment;filename*=UTF-8\'\'' + encodedFileName;
    res.header('Content-Disposition', content_disposition);
  }
  swiftInitializer.init(function(err, swift) {
    if (err) {
      return next(err);
    }

    swift.getFile(transaction.storage_box_id, transaction.storage_object_id, function(err) {
      if (err) {
        return next(err);
      }
    }, res);
  });
};

var uploadTransactionId = function(req, res, next, id) {
  UploadTransaction.findById(id)
    .exec(function(err, transaction) {
      if (err) {
        return next(err);
      }
      if (!transaction) {
        return next({
          message: 'upload transaction not found'
        });
      }

      req.transaction = transaction;
      return next();
    });
};

var downloadTransactionId = function(req, res, next, id) {
  DownloadTransaction.findById(id)
    .exec(function(err, transaction) {
      if (err) {
        return next(err);
      }
      if (!transaction) {
        return next({
          message: 'download transaction not found'
        });
      }

      req.transaction = transaction;
      return next();
    });
};

var request = function(req, res, next) {
  var transaction;
  switch (req.body.requestType) {
    case 'upload':
      var body = req.body;
      body.storage_box_id = 'starc3_' + req.user.clientId;
      transaction = new UploadTransaction(body);
      break;
    case 'download':
      var body = req.body;
      body.storage_box_id = 'starc3_' + req.user.clientId;
      transaction = new DownloadTransaction(body);
      break;
    default:
      return res.status(500).send({
        status: 'failure',
        message: 'request type unrecogonized'
      });
  }
  transaction.save(function(err, transRet) {
    if (err) {
      return next(err);
    }
    res.status(201).send(transRet);
  });
};

router.route('/upload/:uploadTransactionId')
  .post(upload, uploadCallback);
router.route('/download/:downloadTransactionId')
  .get(download);
router.route('/request/')
  .post(passport.authenticate('basic', {
    session: false
  }), request);

router.param('uploadTransactionId', uploadTransactionId);
router.param('downloadTransactionId', downloadTransactionId);

module.exports = router;
