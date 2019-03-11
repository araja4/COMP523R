/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const instructorController = require('./controllers/instructor');
const userController = require('./controllers/user');
const contactController = require('./controllers/contact');
const clientController = require('./controllers/client');
const studentController = require('./controllers/student');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
var connection_string = "mongodb://localhost:27017/sampledb";
if(process.env.MONGODB_PASSWORD){
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    connection_string = "mongodb://" +
        process.env.MONGODB_USER + ":" +
        process.env.MONGODB_PASSWORD + "@" +
        process.env[mongoServiceName + '_SERVICE_HOST'] + ":" +
        process.env[mongoServiceName + '_SERVICE_PORT'] + "/" +
        process.env.MONGODB_DATABASE;
}
console.log('attempting to connect to MongoDB at ' + connection_string);
mongoose.connect(connection_string);
mongoose.connection.on('error', () => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: connection_string,
    autoReconnect: true
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  if (req.path === '/api/upload') {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== '/login' &&
      req.path !== '/signup' &&
      !req.path.match(/^\/auth/) &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
      req.path == '/account') {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 * Public routes
 */
// This shows the public the currently approved projects
app.get('/approved', instructorController.getApprovedProjectsPublicView);
/**
 * Instructor routes
 */
// check if they are logged in, then check if they are an instructor, only then let them get the page
app.get('/instructor',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getDashboard);
app.post('/instructor', passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postDashboard);
app.get('/instructor/client-proposals',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getClientProposals);
app.post('/instructor/client-proposals',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postClientProposals);
app.get('/instructor/email-clients',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getEmailClients);
app.post('/instructor/email-clients',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postEmailClients);
app.post('/instructor/email-clients/confirmation',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postEmailConfirmation);

// Dynamic content for client-proposals
app.get('/instructor/approvedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getApprovedProjects);
app.get('/instructor/pendingProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getPendingProjects);
app.get('/instructor/rejectedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getRejectedProjects);
app.get('/instructor/deletedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getDeletedProjects);

// Google OAuth2
app.get('/instructor/email-authentication',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getEmailAuthentication);
app.post('/instructor/email-authentication',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postEmailAuthentication);
app.get('/instructor/test-authentication',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getTestAuthentication);

// Email Templates
app.get('/instructor/add-template',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getAddTemplate);
app.post('/instructor/add-template',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postAddTemplate);
app.get('/instructor/modify-templates',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getModifyTemplates);
app.post('/instructor/modify-templates',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postModifyTemplates);

// JSON api
app.get('/api/approvedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getApprovedJSON);
app.get('/api/pendingProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getPendingJSON);
app.get('/api/rejectedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getRejectedJSON);
app.get('/api/deletedProjects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getDeletedJSON);
app.get('/api/emailTemplates',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getEmailTemplates);

// Client time management
app.get('/instructor/client-chosen-times',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getClientTimes);
app.get('/instructor/assign-success',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getAssignSuccess);
app.get('/instructor/schedule-edit',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getScheduleEdit);
app.post('/instructor/schedule-edit',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.postScheduleEdit);

// Student team stuff
app.get('/instructor/view-student-submitted-teams',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getSubmittedTeams);
app.get('/instructor/generate-final-teams',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getGeneratedTeams);
app.get('/instructor/compute-team-mapping-to-projects',passportConfig.isAuthenticated,passportConfig.isInstructor, instructorController.getTeamMappingToProjects);


/**
 * Client routes
 */
app.get('/client/information', clientController.getClientInformation);
app.get('/client/agreement', clientController.getClientAgreement);
app.get('/client/form', clientController.getClientForm);
app.post('/client/form', clientController.postClientForm);
app.get('/client/client-times', clientController.getClientTime);
app.post('/client/client-times', clientController.postClientTime);
app.get('/client/submission-successful', clientController.getClientFormSubmitted)

/**
 * Student routes
 */
app.get('/student', studentController.getStudentForm);
app.post('/student', studentController.postStudentForm);
app.get('/student/resources', studentController.getStudentResources);
app.get('/successfulSubmission', studentController.getSubmissionSuccess);

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
// Needed for OpenShift. Remove if not using OpenShift
var IP_ADDRESS = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;

app.listen(PORT, IP_ADDRESS,() => {
    console.log(`Express server listening on port ${PORT} in ${app.settings.env} mode`);
});

/* Add this back in if not using OpenShift
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); 
  console.log('  Press CTRL-C to stop\n');
});
*/

module.exports = app;
