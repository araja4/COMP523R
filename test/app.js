const request = require('supertest');
const app = require('../app.js');
const chai = require('chai');
const chaiHttp = require('chai-http');
var should = chai.should();

chai.use(chaiHttp);

describe('GET /', () => {
  it('should return 200 OK', (done) => {
    request(app)
      .get('/')
      .expect(200, done);
  });
});

describe('GET /login', () => {
  it('should return 200 OK', (done) => {
    request(app)
      .get('/login')
      .expect(200, done);
  });
});

describe('GET /signup', () => {
  it('should return 200 OK', (done) => {
    request(app)
      .get('/signup')
      .expect(200, done);
  });
});

describe('GET /contact', () => {
  it('should return 200 OK', (done) => {
    request(app)
      .get('/contact')
      .expect(200, done);
  });
});

// Allows the middleware to think we're already authenticated.
app.request.isInstructor = function() {
  return true;
};
app.request.isAuthenticated = function() {
  return true;
};
describe('GET /api/approvedProjects', function() {

  it('should return approved client projects', function(done) {
    chai.request(app)
      .get('/api/approvedProjects')
      .end(function (err,res) {
        res.body.clients.should.be.json;
        res.should.have.status(200);
        done();
      })
      // more tests...
      //done();
  });
});

describe('GET /random-url', () => {
  it('should return 404', (done) => {
    request(app)
      .get('/reset')
      .expect(404, done);
  });
});
