var should = require('should');
var request = require('supertest');
var path = require('path');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var serverAgent = require('../serverAgent.js');
var _ = require('lodash');

/**
 * Globals
 */
var app, agent, token, credentials, _user, admin;

/**
 * User routes tests
 */
describe('User Reset Password Route tests', function() {

    before(function(done) {
        // Get application
        var testServer = require('./testServer');
        app = testServer.app();
        agent = testServer.agent();
        done();
    });

    beforeEach(function(done) {
        // Create user credentials
        credentials = {
            username: 'username',
            password: 'M3@n.jsI$Aw3'
        };

        // Create a new user
        _user = {
            email: 'test@test.com',
            username: credentials.username,
            password: credentials.password
        };

        User.remove().exec(function() {
            var user = _.clone(_user);
            agent.post('/user/register')
                .send(user)
                .then(function(signupRes) {
                    token = signupRes.body.accessToken;
                    return done();
                });
        });
    });

    it('should be unable to reset user with same username', function(done) {
        var user = _.clone(_user);
        user.email = 'wolegeca@wolegeca.com';
        agent.post('/user/register')
            .send(user)
            .expect(400)
            .end(function(err, res) {
                // Handle signup error
                if (err) {
                    return done(err);
                }
                res.body.status.should.equal('failure');
                return done();
            });
    });

    it('should be unable to reset user with same email', function(done) {
        var user = _.clone(_user);
        user.username = 'wolegeca';
        agent.post('/user/register')
            .send(user)
            .expect(400)
            .end(function(err, res) {
                // Handle signup error
                if (err) {
                    return done(err);
                }
                res.body.status.should.equal('failure');
                return done();
            });
    });


    afterEach(function(done) {
        User.remove().exec(done);
    });

    after(function(done) {
        done();
    });
});
