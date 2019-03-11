const mongoose = require('mongoose');
const {expect} = require('chai');
const sinon = require('sinon');
require('sinon-mongoose');

const User = require('../models/User');
const Student = require('../models/Student');
const Client = require('../models/Client');

describe('User Model', () => {
  it('should create a new user', (done) => {
    const UserMock = sinon.mock(new User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;

    UserMock
      .expects('save')
      .yields(null);

    user.save(function (err, result) {
      UserMock.verify();
      UserMock.restore();
      expect(err).to.be.null;
      done();
    });
  });

  it('should return error if user is not created', (done) => {
    const UserMock = sinon.mock(new User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;
    const expectedError = {
      name: 'ValidationError'
    };

    UserMock
      .expects('save')
      .yields(expectedError);

    user.save((err, result) => {
      UserMock.verify();
      UserMock.restore();
      expect(err.name).to.equal('ValidationError');
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should not create a user with the unique email', (done) => {
    const UserMock = sinon.mock(User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;
    const expectedError = {
      name: 'MongoError',
      code: 11000
    };

    UserMock
      .expects('save')
      .yields(expectedError);

    user.save((err, result) => {
      UserMock.verify();
      UserMock.restore();
      expect(err.name).to.equal('MongoError');
      expect(err.code).to.equal(11000);
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should find user by email', (done) => {
    const userMock = sinon.mock(User);
    const expectedUser = {
      _id: '5700a128bd97c1341d8fb365',
      email: 'test@gmail.com'
    };

    userMock
      .expects('findOne')
      .withArgs({ email: 'test@gmail.com' })
      .yields(null, expectedUser);

    User.findOne({ email: 'test@gmail.com' }, (err, result) => {
      userMock.verify();
      userMock.restore();
      expect(result.email).to.equal('test@gmail.com');
      done();
    })
  });

  it('should remove user by email', (done) => {
    const userMock = sinon.mock(User);
    const expectedResult = {
      nRemoved: 1
    };

    userMock
      .expects('remove')
      .withArgs({ email: 'test@gmail.com' })
      .yields(null, expectedResult);

    User.remove({ email: 'test@gmail.com' }, (err, result) => {
      userMock.verify();
      userMock.restore();
      expect(err).to.be.null;
      expect(result.nRemoved).to.equal(1);
      done();
    })
  });
});

describe('Student Submission Form', () => {
  it('should create a new student form', (done) => {
    const StudentMock = sinon.mock(new Student({ numStudents: "4",
      student1: "Bob",
      student2: "Bill",
      student3: "Stacy",
      student4: "May",
      preferenceList: "A,B,C,D" }));
    const student = StudentMock.object;

    StudentMock
        .expects('save')
        .yields(null);

    student.save(function (err, result) {
      StudentMock.verify();
      StudentMock.restore();
      expect(err).to.be.null;
      done();
    });
  });

  it('should return error if student is not created', (done) => {
    const StudentMock = sinon.mock(new Student({ numStudents: "5", password: 'root' }));
    const student = StudentMock.object;
    const expectedError = {
      name: 'ValidationError'
    };

    StudentMock
        .expects('save')
        .yields(expectedError);

    student.save((err, result) => {
      StudentMock.verify();
      StudentMock.restore();
      expect(err.name).to.equal('ValidationError');
      expect(result).to.be.undefined;
      done();
    });
  });
});

describe('Client Submission Form', () => {
  it('should create a new client form', (done) => {
    const ClientMock = sinon.mock(new Client({ email: "string",
      name: "string",
      organization: "string",
      presentation: "string",
      project: "string",
      description: "desc",
      term: "term",
      isDecided: false,
      isApproved: false,
      isDeleted: false,
      sentApproval: false,
      sentDenial: false,
      sentDeletion: false,
      sentPitchSchedule: false,
      status: "false",
      selectedTimes: ["9am"],
      presentationNote: "notes",
      presentationTime: "wooo"}));
    const client = ClientMock.object;

    ClientMock
        .expects('save')
        .yields(null);

    client.save(function (err, result) {
      ClientMock.verify();
      ClientMock.restore();
      expect(err).to.be.null;
      done();
    });
  });

  it('should return error if client is not created', (done) => {
    const ClientMock = sinon.mock(new Client({ numStudents: "5", password: 'root' }));
    const client = ClientMock.object;
    const expectedError = {
      name: 'ValidationError'
    };

    ClientMock
        .expects('save')
        .yields(expectedError);

    client.save((err, result) => {
      ClientMock.verify();
      ClientMock.restore();
      expect(err.name).to.equal('ValidationError');
      expect(result).to.be.undefined;
      done();
    });
  });
});