var BasicStrategy = require('passport-http').BasicStrategy;
var passport = require('passport');
var conf = require('./config/config').getConfig();
var Client = require('./client');
var mongoose = require('mongoose');

var strategy = new BasicStrategy(
    function(clientId, clientSecret, done) {
        Client.findOne({
            clientId: clientId
        }, function(err, client) {
            if (err) {
                return done(err);
            }
            if (!client) {
                return done(null, false);
            }
            if (!client.authenticate(clientSecret)) {
                return done(null, false);
            }
            // console.log(client);
            return done(null, client);
        });
    }
);
module.exports = function() {
    passport.use('basic', strategy);
    console.log('Strategy basic initialized');
};
