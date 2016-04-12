var express = require('express');
var router = express.Router();
var path = require('path');
var conf = require('./config/config').getConfig();
var mongoose = require('mongoose');
var fetch = require('isomorphic-fetch');
var uuid = require('uuid');
var passport = require('passport');
var request = require('request');

var swiftInitializer = require('./services/swiftInitializer.js');

var UploadTransaction = mongoose.model('UploadTransaction');
var DownloadTransaction = mongoose.model('DownloadTransaction');
var CopyTransaction = mongoose.model('CopyTransaction');

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

        console.log('ret.headers');
        console.log(ret.headers);
        // req now has openStack info
        fileUploaded.contentType = ret.headers['content-type'];
        fileUploaded.size = ret.headers['content-length'];
        fileUploaded.name = decodeURIComponent((req.headers['x-object-meta-encoded-org-name']));
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

  request({
    method: transaction.requestMethod,
    uri: transaction.requestUri,
    json: true,
    followRedirect: false,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': transaction.authorization
    },
    body: {
      callbackBody: transaction.requestBody,
      file: file
    }
  }, function(error, response, body) {
    if (error) {
      return next(err);
    }
    if (response.statusCode >= 301 && response.statusCode <= 307) {
      var location = response.headers.location;
      res.set('Location', location);
      return res.status(302).send();
    }
    return res.status(response.statusCode).send(body);
  });
};

var download = function(req, res, next) {
  var transaction = req.transaction;
  transaction.remove();

  if (transaction.fileName) {
    var encodedFileName = encodeURIComponent(transaction.fileName);
    var content_disposition = 'attachment;filename*=UTF-8\'\'' + encodedFileName;
    res.header('Content-Disposition', content_disposition);
  }

  //如果没有传filename 也可以去云里查文件的元数据获得
  swiftInitializer.init(function(err, swift) {
    if (err) {
      return next(err);
    }

    swift.getFile(transaction.storage_box_id, transaction.storage_object_id, function(err, ret) {
      if (err) {
        return next(err);
      }

      if (ret) console.log(ret.headers);
    }, res);
  });
};

var copy = function(req, res, next) {
  var transaction = req.transaction;
  transaction.remove();

  var fileCopyed = {
    storage_object_id: uuid.v4(),
    storage_box_id: 'starc3_' + req.user.clientId
  };
  //如果没有传filename 也可以去云里查文件的元数据获得
  swiftInitializer.init(function(err, swift) {
    if (err) {
      return next(err);
    }

    swift.copyObject(fileCopyed.storage_box_id,
      fileCopyed.storage_object_id,
      transaction.storage_box_id,
      transaction.storage_object_id,
      function(err, response) {
        if (err) {
          return next(err);
        }
        console.log(response.statusCode);
        console.log(response.headers);
        console.log(response.body);

        // req now has openStack info
        fileCopyed.contentType = ret.headers['content-type'];
        fileCopyed.size = ret.headers['content-length'];
        fileCopyed.name = decodeURIComponent((req.headers['x-object-meta-encoded-org-name']));
        fileCopyed.etag = ret.headers.etag;

        res.status(response.statusCode).send(fileCopyed);
      });
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

var copyTransactionId = function(req, res, next, id) {
  CopyTransaction.findById(id)
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

var requestTransaction = function(req, res, next) {
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
    case 'copy':
      var body = req.body;
      body.storage_box_id = 'starc3_' + req.user.clientId;
      transaction = new CopyTransaction(body);
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

// for end user to call;

router.route('/upload/:uploadTransactionId')
  .post(upload, uploadCallback);
router.route('/download/:downloadTransactionId')
  .get(download);

// for client-server to call;
router.route('/copy/:copyTransactionId')
  .post(passport.authenticate('basic', {
    session: false
  }), copy);

router.route('/request/')
  .post(passport.authenticate('basic', {
    session: false
  }), requestTransaction);

//params
router.param('uploadTransactionId', uploadTransactionId);
router.param('downloadTransactionId', downloadTransactionId);
router.param('copyTransactionId', copyTransactionId);

module.exports = router;
