var path = require('path');
var conf = require('../config/config').getConfig();

/**
 * dependencies.
 */

var protocol = conf.port === 443 ? require('https') : require('http');
var wrap = require('wrap');
var MultipartParser = require('./multipart').MultipartParser;


/**
 * Util.
 */

function extend(destination, source) {
  for (var property in source) {
    if (source.hasOwnProperty(property)) {
      destination[property] = source[property];
    }
  }
  return destination;
}

function fileName(headerValue) {
  var m = headerValue.match(/filename="(.*?)"($|; )/i);
  if (!m) return;

  var filename = m[1].substr(m[1].lastIndexOf('\\') + 1);
  filename = filename.replace(/%22/g, '"');
  filename = filename.replace(/&#([\d]{4});/g, function(m, code) {
    return String.fromCharCode(code);
  });

  return filename;
}

function multiPart(options) {
  var parser = new MultipartParser();
  var headerField;
  var headerValue;
  var part = {};

  parser.initWithBoundary(options.boundary);

  parser.onPartBegin = function() {
    part.headers = {};
    part.name = null;
    part.filename = null;
    part.mime = null;
    headerField = '';
    headerValue = '';
  };

  parser.onHeaderField = function(b, start, end) {
    headerField += b.toString(options.encoding, start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString(options.encoding, start, end);
  };

  parser.onHeaderEnd = function() {
    headerField = headerField.toLowerCase();
    part.headers[headerField] = headerValue;

    var name = headerValue.match(/name="([^"]+)"/i);
    if (headerField === 'content-disposition') {
      if (name) {
        part.name = name[1];
        part.filename = fileName(headerValue);
        //multipart中的文件名 需要放在options.openstackFileName中返回给调用函数
        // options.openstackFileName = part.filename;
        // options.filename = part.filename;
        console.log('part.filename:' + part.filename);
        options.headers['filename'] = part.filename;
        options['filename'] = part.filename;
        options.path += '?filename=' + part.filename;
      }
    } else if (headerField === 'content-type') {
      part.mime = headerValue;
      options.contentType = headerValue;
      options.headers['Content-Type'] = headerValue;
    }

    headerField = '';
    headerValue = '';
  };

  parser.onHeadersEnd = function() {
    if (options.onHeadersEnd) {
      options.onHeadersEnd(part);
    }
  };

  parser.onPartData = function(b, start, end) {
    if (options.onPartData) {
      options.onPartData(b.slice(start, end));
    }
  };

  return parser;
}

/**
 * Class.
 */

function Swift(options, callback) {
  this.options = extend({
    user: 'username',
    pass: 'userpass',
    host: 'hostname',
    port: 3000
  }, options);

  var self = this;

  this.request({
    headers: {
      'X-Storage-User': this.options.user,
      'X-Storage-Pass': this.options.pass
    }
  }, function(err, res) {
    if (!err && res.headers['x-storage-url'] && res.headers['x-auth-token']) {
      self.account = res.headers['x-storage-url'].split('v1/')[1];
      self.token = res.headers['x-auth-token'];
    }
    if (callback) {
      callback(err, res);
    }
  }.wrap(this));
}

/**
 * Storage Account Services.
 */


Swift.prototype.request = function(options, callback, pipe) {

  var downloadFlag = pipe && pipe.res;
  var uploadFlag = pipe && pipe.req;

  var otherBusinessFlag = !pipe;

  options = extend({
    host: this.options.host,
    port: this.options.port,
    path: '/auth/v1.0',
    method: 'GET',
    headers: {
      'X-Auth-Token': this.token,
      'X-Storage-Token': this.token
    }
  }, options);

  options.headers['User-Agent'] = 'Node.JS Swift API Client';
  options.path = encodeURI(options.path);

  if (otherBusinessFlag) {
    var businessReq = protocol.request(options, function(res) {
      var buffers = [];
      if (downloadFlag) {
        pipe.res.header('Content-Length', res.headers['content-length']);
        pipe.res.header('Content-Type', options.headers['content-type'] ? options.headers['content-type'] : res.headers['content-type']);
      }

      res.on('data', function(buffer) {
        buffers.push(buffer);
      });

      res.on('end', function(err) {
        res.body = buffers.join('');
        if (callback) {
          if (err) {
            console.log(err);
          }
          callback(err, res);
        }
      });
    });

    businessReq.on('error', function(err) {
      if (callback) {
        callback(err);
      }
    });

    return businessReq.end();
  }

  if (downloadFlag) {

    var downloadReq = protocol.request(options, function(res) {

      pipe.res.header('Content-Length', res.headers['content-length']);
      pipe.res.header('Content-Type', res.headers['content-type']);

      res.on('data', function(buffer) {
        if (res.statusCode >= 400) {
          if (callback) {
            callback({
              statusCode: res.statusCode,
              body: res.body
            });
          }
        } else {
          pipe.res.write(buffer);
        }
      });

      res.on('end', function(err) {
        callback(err);
      });
    });

    downloadReq.on('error', function(err) {
      if (callback) {
        callback(err);
      }
    });

    return downloadReq.end();
  }

  if (uploadFlag) {

    var uploadReq;

    var bytesReceived = 0;

    var parser = options.boundary ? multiPart(extend(options, {
      onHeadersEnd: function() {
        uploadReq = protocol.request(options, function(res) {

          console.log('options:');
          console.log(options);
          res.on('data', function() {
            if (res.statusCode >= 400) {
              if (callback) {
                callback({
                  statusCode: res.statusCode,
                  body: res.body
                });
              }
            } else {
              callback();
            }
          });

          res.on('end', function(err) {
            callback(err, res);
          });
        });

      },
      onPartData: function(buffer) {
        uploadReq.write(buffer);
      }
    })) : null;

    pipe.req.on('data', function(buffer) {
      parser.write(buffer);
      pipe.req.emit('progress', bytesReceived += buffer.length, options.contentLength || options.headers['Content-Length']);
    });

    pipe.req.on('end', function() {
      pipe.req.openstack = {};
      pipe.req.openstack.fileName = options.openstackFileName;

      uploadReq.on('error', function(err) {
        callback(err);
      });

      uploadReq.end();
    });
  }

};

// List Containers
Swift.prototype.listContainers = function(callback) {
  this.request({
    path: '/v1.0/' + this.account + '?format=json'
  }, callback);
};

// Retrieve Account Metadata *
Swift.prototype.retrieveAccountMetadata = function(callback) {
  this.request({
    path: '/v1.0/' + this.account,
    method: 'HEAD'
  }, callback);
};


/**
 * Storage Container Services.
 */

// List Objects
Swift.prototype.listObjects = function(object, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + object + '?format=json'
  }, callback);
};

// Create Container
Swift.prototype.createContainer = function(container, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container,
    method: 'PUT'
  }, callback);
};

// Delete Container
Swift.prototype.clearContainer = function(container, callback) {
  var self = this;
  var objects = [];

  this.listObjects(container, function(err, result) {
    try {
      objects = JSON.parse(result.body);
    } catch (e) {}
    objects.forEach(function(obj) {
      self.deleteObject(container, obj.name);
    });
  });
};

// Retrieve Container Metadata *
Swift.prototype.retrieveContainerMetadata = function(container, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container,
    method: 'HEAD'
  }, callback);
};


/**
 * Storage Object Services.
 */

// Object stream on pipe
Swift.prototype.getFile = function(container, object, callback, isDownload, res) {
  var options = {
    path: '/v1.0/' + this.account + '/' + container + '/' + object,
    headers: {}
  };

  if (isDownload) {
    options.headers['content-type'] = 'application/octet-stream';
  }
  this.request(options, callback, {
    res: res
  });
};

// Create/Update Object
Swift.prototype.createObject = Swift.prototype.updateObject = function(container, object, callback, req) {
  var options = {
    path: '/v1.0/' + this.account + '/' + container + '/' + object,
    method: 'PUT',
    filename: object,
    headers: {
      'X-Auth-Token': this.token
        //, 'ETag': crypto.createHash('md5').update(container + '/' + object).digest('hex')
        //, 'X-Object-Meta-PIN': 1234
    }
  };

  if (req.xhr) {
    options.headers['Content-Length'] = req.headers['content-length'];
  } else {
    var boundary = req.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    extend(options, {
      contentLength: req.headers['content-length'],
      encoding: 'utf-8',
      boundary: boundary[1] || boundary[2]
    });
    options.headers['Transfer-Encoding'] = 'chunked';
  }

  this.request(options, callback, {
    req: req
  });
};

// Retrieve Object *
Swift.prototype.retrieveObject = function(container, object, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container + '/' + object
  }, callback);
};

// Delete Object
Swift.prototype.deleteObject = function(container, object, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container + '/' + object,
    method: 'DELETE'
  }, callback);
};

// Retrieve Object Metadata *
Swift.prototype.retrieveObjectMetadata = function(container, object, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container + '/' + object,
    method: 'HEAD'
  }, callback);
};

// Update Object Metadata *
Swift.prototype.updateObjectMetadata = function(container, object, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container + '/' + object,
    method: 'POST'
  }, callback);
};

// Copy Object
Swift.prototype.copyObject = function(container, destObject, fromContainer, sourceObject, callback) {
  this.request({
    path: '/v1.0/' + this.account + '/' + container + '/' + destObject,
    method: 'PUT',
    headers: {
      'X-Auth-Token': this.token,
      'X-Copy-From': fromContainer + '/' + sourceObject
    }
  }, callback);
};

module.exports = Swift;
