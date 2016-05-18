var path = require('path');
var conf = require('../config/config').getConfig();
var Swift = require('./swift.js');

var cloudAuthPath = '/auth/v1.0/';

var cloudUrl = conf.openStackConfig.cloudUrl;
var cloudPort = conf.openStackConfig.cloudPort;
var xAuthUser = conf.openStackConfig.xAuthUser;
var xAuthKey = conf.openStackConfig.xAuthKey;

exports.init = function(callback) {
    var swift = new Swift({
        user: xAuthUser,
        pass: xAuthKey,
        host: cloudUrl,
        path: cloudAuthPath,
        port: cloudPort
    }, function(err, res) {
        if (swift.account && swift.token) {
            return callback(null, swift);
        } else {
            return callback('swift auth failed: ' + err);
        }
    });
};
