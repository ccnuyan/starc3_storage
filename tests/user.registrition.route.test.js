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
var app, agent, credentials,  _user, admin;

/**
 * User routes tests
 */
describe('User Route tests', function() {

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

    User.remove().exec(done);
  });

  it('should be able to register a new user', function(done) {
    var user = _.clone(_user);
    agent.post('/user/register')
      .send(user)
      .expect(200)
      .end(function(signupErr, signupRes) {
        // Handle signpu error
        if (signupErr) {
          return done(signupErr);
        }
        signupRes.body.payload.username.should.equal(_user.username);
        return done();
      });
  });

  it('should be unable to register user with invalid username', function(done) {
    var user = _.clone(_user);
    user.username = '123abc';
    agent.post('/user/register')
      .send(user)
      .expect(400)
      .end(done);
  });

  it('should be unable to register user with invalid email', function(done) {
    var user = _.clone(_user);
    user.email = '123abc';
    agent.post('/user/register')
      .send(user)
      .expect(400)
      .end(done);
  });

  afterEach(function(done) {
    User.remove().exec(done);
  });

  after(function(done){
    done();
  });
});
