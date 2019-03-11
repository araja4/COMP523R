const Client = require('../models/Client');
const Email = require('../models/Email');
const async = require('async');
const nodemailer = require('nodemailer');
const Students = require('../models/Student');
const TimeList = require('../models/TimeList');
const xoauth2 = require('xoauth2');
const GeneratedTeams = require('../models/GeneratedTeams');
const Credential = require('../models/Credential');
const numTeamsOf4 = 12;  // change this number to the number of desired student teams and number of corresponding projects


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        xoauth2: xoauth2.createXOAuth2Generator({
            type: 'OAuth2',
            user: "",
            clientId: "",
            clientSecret: "",
            refreshToken: ""
        })
    }
});


function updateTransporter() {
    Credential.findOne({}, (err, credential) => {
        if (err) return;
        if (credential) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    xoauth2: xoauth2.createXOAuth2Generator({
                        type: 'OAuth2',
                        user: credential.emailAddress,
                        clientId: credential.clientID,
                        clientSecret: credential.clientSecret,
                        refreshToken: credential.refreshToken
                    })
                }
            });
        }
    });
}
//Always run at startup
updateTransporter();

/**
 * GET /
 * Dashboard.
 */
exports.getDashboard = (req, res) => {
    var locals = {};
    // process all 5 queries in parallel
    // all queries return a `callback` when complete
    // waits for all 5 callbacks to process asynchronously, then proceeds
    async.parallel([
        // Undecided client proposals
        function(callback) {
            Client.count({isDecided: false, isDeleted: false}, (err, count) => {
                if (err) return callback(err);
                locals.undecided = count;
                callback();
            });
        },
        // Rejected client proposals
        function(callback) {
            Client.count({isDecided: true, isApproved: false, isDeleted: false}, (err, count) => {
                if (err) return callback(err);
                locals.rejected = count;
                callback();
            });
        },
        // Approved client proposals
        function(callback) {
            Client.count({isDecided: true, isApproved: true, isDeleted: false}, (err, count) => {
                if (err) return callback(err);
                locals.approved = count;
                callback();
            });
        },
        // Deleted client proposals
        function(callback) {
            Client.count({isDeleted: true}, (err, count) => {
                if (err) return callback(err);
                locals.deleted = count;
                callback();
            });
        },
        // List of all schedule and current schedule
        function(callback) {
            TimeList.find({}, (err, result) => {
                if (err) return callback(err);
                locals.schedules = result;
                locals.currentSchedule = [];
                result.forEach(function(x) {
                    if (x.current)
                        locals.currentSchedule.push(x);
                });
                callback();
            });
        }
    ], function(err) { //This function gets called after the five tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, we let express handle it by calling the `next` function
        //Here `locals` will be an object with `undecided`, `rejected` and `approved` keys
        res.render('instructor/instructorDashboard', {
            title: 'Instructor Dashboard',
            pendingClientRequests: locals.undecided,
            rejectedClientRequests: locals.rejected,
            approvedClientRequests: locals.approved,
            deletedClientRequests: locals.deleted,
            schedules: locals.schedules,
            current: locals.currentSchedule,
        });
    });
};

/**
 * POST /
 * This is only for settling multiple schedule conflicts
 */
exports.postDashboard = (req, res) => {
    TimeList.update({current: true}, {$set: {current: false}}, {multi: true}, function(err, result) {
        if (err) return handleError(err);
        TimeList.findOneAndUpdate({name: req.body.chosenschedule}, {$set: {current: true}}, function(err, x) {
            if (err) return handleError(err);
            res.redirect('back');
        });
    });
};

/**
 * GET /instructor/client-proposals
 * Display all pending client proposals, and all approval/denial by instructor.
 */
exports.getClientProposals = (req, res) => {
    res.render('instructor/instructorClientProposals',{
        title: 'Review Client Proposals'
    });
};
//This is the public view of currently approved projects
/**
 * GET /account/approvedProjectsPublicView
 * Display all approved client projects
 */
exports.getApprovedProjectsPublicView = (req, res) => {
    Client.find({isDecided: true, isApproved: true, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.render('account/approvedProjectsPublicView', {
            title: 'Approved Client Projects',
            clients: Clients
        });
    });
};
//The following three GET requests are dynamic content populated in client-proposals
/**
 * GET /instructor/pendingProjects
 * Display all pending client projects
 */
exports.getPendingProjects = (req, res) => {
    Client.find({isDecided: false, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.render('instructor/pendingProjects', {
            title: 'Pending Client Proposals',
            clients: Clients
        });
    });
};
/**
 * GET /instructor/approvedProjects
 * Display all approved client projects
 */
exports.getApprovedProjects = (req, res) => {
    Client.find({isDecided: true, isApproved: true, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.render('instructor/approvedProjects', {
            title: 'Approved Client Proposals',
            clients: Clients
        });
    });
};
/**
 * GET /instructor/rejectedProjects
 * Display all rejected client projects
 */
exports.getRejectedProjects = (req, res) => {
    Client.find({isDecided: true, isApproved: false, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.render('instructor/rejectedProjects', {
            title: 'Rejected Client Proposals',
            clients: Clients
        });
    });
};
/**
 * GET /instructor/deletedProjects
 * Display all deleted client projects
 */
exports.getDeletedProjects = (req, res) => {
    Client.find({isDeleted: true}, (err, Clients) => {
        if (err) return handleError(err);
        res.render('instructor/deletedProjects', {
            title: 'Deleted Client Proposals',
            clients: Clients
        });
    });
};

/**
 * POST /instructor
 * Submit instructor's approval/denials.
 * Change the client's values of isDecided and isApproved accordingly
 */
exports.postClientProposals= (req, res) => {
    var decision = req.body.Decision;
    var clientID = req.body.clientID;
    console.log('Recieved request for ' + clientID);
    console.log('This instructor ' + decision + ' this request');
    // Find the client that the instructor approved/denied. Process CRUD.
    Client.findOne({_id: clientID}, (err, client) => {
        if (err) return handleError(err);
        if (decision == 'Approve') {
            client.isDecided = true;
            client.isApproved = true;
            client.isDeleted = false;
            client.status = 'Approved';
            client.save(function (err, client) {
                if (err) { return res.status(500).send(err); }
                else return res.redirect('back');
            });
        } else if (decision == 'Deny') {
            client.isDecided = true;
            client.isApproved = false;
            client.isDeleted = false;
            client.status = 'Rejected';
            client.save(function (err, client) {
                if (err) { return res.status(500).send(err); }
                else return res.redirect('back');
            });
        } else if (decision == 'Delete') {
            client.isDecided = true;
            client.isApproved = false;
            client.isDeleted = true;
            client.status = 'Deleted';
            client.save(function (err, client) {
                if (err) { return res.status(500).send(err); }
                else return res.redirect('back');
            });
        } else if (decision == 'Pending') {
            client.isDecided = false;
            client.isApproved = false;
            client.isDeleted = false;
            client.status = 'Pending';
            client.save(function (err, client) {
                if (err) { return res.status(500).send(err); }
                else return res.redirect('back');
            });
        };
    });
};

/**
 * GET /instructor/email-clients
 * Display all pending client proposals, and all approval/denial by instructor.
 */
exports.getEmailClients = (req, res) => {
    res.render('instructor/instructorEmailClients',{
        title: 'Manage client emails'
    });
};

/**
 * POST /instructor/email-clients
 * Send an email via Nodemailer.
 */
exports.postEmailClients = (req, res) => {
    var emailData = JSON.parse(req.body.data[1]);
    res.render('instructor/emailConfirmation',{
        title: 'Finalize your email',
        recipients: emailData.finalRecipients,
        subject: emailData.finalSubject,
        body: emailData.finalBody,
        senderName: emailData.senderName
    });
};

/**
 * POST /instructor/email-confirmation
 * Send an email via Nodemailer.
 */
exports.postEmailConfirmation = (req, res) => {
    var emailData = JSON.parse(req.body.data);
    var recipients = emailData.finalRecipients;
    var subject = emailData.finalSubject;
    var body = emailData.finalBody;
    var senderName = emailData.senderName;
    //emailCategory structure: {Approve: false, Deny: false, Delete: false, Schedule: true}
    var emailCategory = emailData.emailCategory;
    var decision = req.body.Decision;

    // Find the client that the instructor approved/denied. Process CRUD.
    for (recipient of recipients) {
        Client.findOne({_id: recipient._id}, (err, client) => {
            if (err) return handleError(err);
            if (decision == 'Manual') {
                if (emailCategory.Approve == true) {client.sentApproval = true;}
                if (emailCategory.Deny == true) {client.sentDenial = true;}
                if (emailCategory.Delete == true) {client.sentDeletion = true;}
                if (emailCategory.Schedule == true) {client.sentPitchSchedule = true;}
                client.save(function (err, client) {
                    if (err) { return res.status(500).send(err); }
                });
            } else if (decision == 'Automatic') {
                //personalize the body of the message
                var personalizedBody = body;
                personalizedBody = personalizedBody.replace("{Client}", client.name);
                personalizedBody = personalizedBody.replace("{Instructor}", senderName);
                //Send email
                // 'to' is a comma separated list of recipients  e.g. 'bar@blurdybloop.com, baz@blurdybloop.com'
                var mailOptions = {
                    to: `${client.name} <${client.email}>`,
                    from: `${senderName} <${transporter._options.auth.xoauth2.options.user}>`,
                    subject: subject,
                    text: personalizedBody
                };
                // verify connection configuration
                transporter.verify(function(error, success) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Server is ready to take our messages');
                    }
                });
                transporter.sendMail(mailOptions, (err, response) => {
                    if (err) {
                        req.flash('errors', { msg: err.message });
                        console.log(err);
                    }else{
                        req.flash('success', { msg: 'Email has been sent successfully!' });
                        console.log("Message sent: " + response.message);
                    }
                    transporter.close();
                });

                if (emailCategory.Approve == true) {client.sentApproval = true;}
                if (emailCategory.Deny == true) {client.sentDenial = true;}
                if (emailCategory.Delete == true) {client.sentDeletion = true;}
                if (emailCategory.Schedule == true) {client.sentPitchSchedule = true;}
                client.save(function (err, client) {
                    if (err) { return res.status(500).send(err); }
                });
            };
        });
    }
    return res.redirect('/instructor/email-clients');
};

//The following three GET requests for JSON of all client types
//This is only a slight change to the full page renders. Change this later?
/**
 * GET /instructor/pendingProjects
 * Display all pending client projects
 */
exports.getPendingJSON = (req, res) => {
    Client.find({isDecided: false, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.send(Clients);
    });
};
/**
 * GET /instructor/approvedProjects
 * Display all approved client projects
 */
exports.getApprovedJSON = (req, res) => {
    Client.find({isDecided: true, isApproved: true, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.send(Clients);
    });
};
/**
 * GET /instructor/rejectedProjects
 * Display all rejected client projects
 */
exports.getRejectedJSON = (req, res) => {
    Client.find({isDecided: true, isApproved: false, isDeleted: false}, (err, Clients) => {
        if (err) return handleError(err);
        res.send(Clients);
    });
};
/**
 * GET /instructor/deletedProjects
 * Display all deleted client projects
 */
exports.getDeletedJSON = (req, res) => {
    Client.find({isDeleted: true}, (err, Clients) => {
        if (err) return handleError(err);
        res.send(Clients);
    });
};

/**
 * GET all email templates
 * returned in JSON format
 */
exports.getEmailTemplates = (req, res) => {
    Email.find({}, (err, Templates) => {
        if (err) return handleError(err);
        res.send(Templates);
    });
};

/**
 * GET /instructor/add-template
 * A form to add an email template
 */
exports.getAddTemplate = (req, res) => {
    res.render('instructor/addTemplate',{
        title: 'Add an email template'
    });
};
/**
 * POST /instructor/add-template
 * Add the template to the database
 */
exports.postAddTemplate = (req, res) => {
    const email = new Email({
        description: req.body.description,
        subject: req.body.subject,
        body: req.body.body,
    });

    email.save((err) => {
        if (err) { throw err; }
        else res.redirect('/instructor');
    });
};
/**
 * GET /instructor/modify-templates
 * Allows you to change or delete templates
 */
exports.getModifyTemplates = (req, res) => {
    Email.find({}, (err, templates) => {
        if (err) return handleError(err);
        res.render('instructor/modifyTemplates', {
            title: 'Modify an existing template',
            templates: templates
        });
    });
};
/**
 * POST /instructor/modify-templates
 * Change templates or delete them
 */
exports.postModifyTemplates= (req, res) => {
    var decision = req.body.modify_button;
    var templateID = req.body.templateID;
    console.log('Recieved request for ' + templateID);
    console.log('Decision is: ' + req.body.modify_button);
    // Find the client that the instructor approved/denied. Process CRUD.
    Email.findOne({_id: templateID}, (err, template) => {
        if (err) return handleError(err);
        if (decision == 'Update') {
            template.description = req.body.description;
            template.subject = req.body.subject;
            template.body = req.body.body;
            template.save(function (err, template) {
                if (err) { return res.status(500).send(err); }
                else return res.redirect('back');
            });
        } else if (decision == 'Delete') {
            template.remove().then(res.redirect('back'));
        }
    });
};

/**
 * GET /instructor/client-chosen-times
 * View the times that clients that selected, and be able to automatically assign final presentation times
 */
exports.getClientTimes = (req, res) => {
    Client.find({ $and: [{selectedTimes: { $exists: true}}, {selectedTimes: { $ne: null}}, {selectedTimes: {$not: {$size: 0}}}]}, (err, result) => {
       if (err) return handleError(err);
       res.render('instructor/instructorClientTimes', {
          title: 'Client Time Preferences',
          clients: result
       });
    });
};

/**
 * GET /instructor/assign-success
 * Assigns final presentation times and presents any messages from the algorithm
 */
exports.getAssignSuccess = (req, res) => {
    var clientLists = new Array();
    var times = new Array();
    var messages = new Array();

    Client.find({ $and: [{selectedTimes: { $exists: true}}, {selectedTimes: { $ne: null}}, {selectedTimes: {$not: {$size: 0}}}]}).sort({'updatedAt': 'desc'}).exec().then(function(result) {

        // Storing clients in an array
        result.forEach(function(x) {
            clientLists.push({
                "name": x.name,
                "times": x.selectedTimes,
                "presTime": null
            });
        });

        // Gathering relevant list of times
        return TimeList.findOne({'current': true}, 'times', function(err, list) {
            if (err) return handleError(err);
            times = list.times;
        }).exec().then(function() {return result});

    }).then(function(result) {

        // Assigning presentation times
        /**
         * The algorithm for assigning times to clients is as follows:
         *      For each time, produce a list of clients who have selected that time.
         *
         *      Of those clients, assign the time to the client who had selected the LEAST
         *      number of total time slots.
         *
         *      If more than one client ties for least number of slots, assign the time to
         *      the client who had completed the form the EARLIEST.
         */
        for (var i=0; i<times.length; i++) {
            var y = new Array();
            var low = 1000;
            var lowIx = new Array();
            for (var j=0; j<clientLists.length; j++) {
                if (clientLists[j].times.indexOf(times[i]) != -1) {
                    y.push(clientLists[j]);
                    if (clientLists[j].times.length < low) {
                        if (clientLists[j].presTime == null) {
                            low = clientLists[j].times.length;
                            lowIx = [];
                            lowIx.push(j);
                        }
                    } else if (clientLists[j].times.length == low) {
                        if (clientLists[j].presTime == null)
                            lowIx.push(j);
                    }
                }
            }
            if (lowIx.length > 0) {
                clientLists[lowIx[0]].presTime = times[i];
            }
        }

        // Updating presentation times in database
        result.forEach(function(x) {
            var ix = clientLists.findIndex(function(element) {return element.name == x.name;});
            x.presentationTime = clientLists[ix].presTime;
            x.save();
            if (x.presentationTime == null)
                messages.push("Client \'" + x.name + "\' did not receive a presentation time.");
        });

        // Rendering success page
        res.render('instructor/instructorAssignSuccess', {
            title: 'Results',
            clients: result,
            messages: messages,
            times: times
        });
    });
};

/**
 * GET /instructor/schedule-edit
 * Edit or create new schedules (TimeList)
 */

exports.getScheduleEdit = (req, res) => {
    TimeList.findOne({'current': true}, function(err, list) {
        if (err) return handleError(err);
        var times, name;
        if (list) {
            name = list.name;
            times = list.times.join('\n');
        } else {
            name = '';
            times = [];
        }
        res.render('instructor/scheduleEdit', {
            title: 'Schedule Edit',
            name: name,
            schedule: times
        });
    });
};

/**
 * POST /instructor/schedule-edit
 * Save new or updated schedule (TimeList)
 */
exports.postScheduleEdit = (req, res) => {
    var times = req.body.times.split(/\r\n|\r|\n/g);
    var makeCurrent;
    if (req.body.active == 'Yes')
        makeCurrent = true;
    else
        makeCurrent = false;
    TimeList.update({current: true}, {$set: {current: false}}, {multi: true}, function(err, result) {
        if (err) return handleError(err);
        TimeList.findOneAndUpdate({'name': req.body.name}, {$set: {'times': times, 'current': makeCurrent}}, {'upsert': true}, function(err, result) {
            if (err) return handleError(err);
            res.render('instructor/scheduleSuccess', {
                title: 'Success',
                times: times
            });
        });
    });
};

/**
 * GET /instructor/view-student-submitted-teams
 * Allows you to view-student-submitted-teams
 */
exports.getSubmittedTeams = (req, res) => {
    Students.find({}, (err, Students) => {
        if (err) return handleError(err);
    res.render('instructor/viewStudentSubmittedTeams', {
        title: 'Student Submitted Teams',
        studentTeams: Students
    });
});
};
/**
 * GET /instructor/generate-final-teams
 * Allows you to generate-final-teams
 */
exports.getGeneratedTeams = (req, res) => {

    var t4 = new Array();
    var t3 = new Array();
    var t2 = new Array();
    var t1 = new Array();
    var unassigned_student_names = new Array;
    var canGenerateMapping = false;

    Students.find({}).then(function(result) {

        result.forEach(function(x) {

            if(x.numStudents==4){
                t4.push({
                    "numStudents": x.numStudents,
                    "student1": x.student1,
                    "student2": x.student2,
                    "student3": x.student3,
                    "student4": x.student4,
                    "preferenceList": x.preferenceList
                });
            } else if(x.numStudents == 3){
                t3.push({
                    "numStudents": x.numStudents,
                    "student1": x.student1,
                    "student2": x.student2,
                    "student3": x.student3,
                    "preferenceList": x.preferenceList
                });
            } else if(x.numStudents == 2){
                t2.push({
                    "numStudents": x.numStudents,
                    "student1": x.student1,
                    "student2": x.student2,
                    "preferenceList": x.preferenceList
                });
            } else {
                t1.push({
                    "numStudents": x.numStudents,
                    "student1": x.student1,
                    "preferenceList": x.preferenceList
                });
            }

        });

        //making teams of 3 into teams of 4
        while(t3.length!=0){
            if(t1.length!=0){ //combining teams of 1 to teams of 3 if possible
                var popped3 = t3.pop();
                var popped1 = t1.pop();
                t4.push({
                    "numStudents": popped3.numStudents+":"+popped1.numStudents,
                    "student1": popped3.student1,
                    "student2": popped3.student2,
                    "student3": popped3.student3,
                    "student4": popped1.student1,
                    "preferenceList": popped3.preferenceList
                });
            }else if(t2.length!=0){ //breaking up teams of 2 to make teams of 3 into teams of 4
                var popped3 = t3.pop();
                var popped2 = t2.pop();
                t4.push({
                    "numStudents": popped3.numStudents+":"+popped2.numStudents+"(s1)",
                    "student1": popped3.student1,
                    "student2": popped3.student2,
                    "student3": popped3.student3,
                    "student4": popped2.student1,
                    "preferenceList": popped3.preferenceList
                });
                t1.push({
                    "numStudents": popped2.numStudents+"(s2)",
                    "student1": popped2.student2,
                    "preferenceList": popped2.preferenceList
                });
            }else{ //break teams of 3 since those are the only teams left if this else is ever excuted
                var popped3 = t3.pop();
                t2.push({ //putting s1, s2 of the popped t3 into t2
                    "numStudents": popped3.numStudents+"(s1,s2)",
                    "student1": popped3.student1,
                    "student2": popped3.student2,
                    "preferenceList": popped3.preferenceList
                });
                t1.push({ //pushing s3 of the popped t3 into t1
                    "numStudents": popped3.numStudents+"(s3)",
                    "student1": popped3.student3,
                    "preferenceList": popped3.preferenceList
                });
            }
        }
        while(t2.length!=0){
            if(t2.length>1){ //if you have more than 1 team of two then compbine teams of 2 to make teams of 4
                var popped2_1 = t2.pop();
                var popped2_2 = t2.pop();
                t4.push({
                    "numStudents": popped2_1.numStudents+":"+popped2_2.numStudents,
                    "student1": popped2_1.student1,
                    "student2": popped2_1.student2,
                    "student3": popped2_2.student1,
                    "student4": popped2_2.student2,
                    "preferenceList": popped2_1.preferenceList
                });
            }else if(t1.length>1){ //have at least 2 teams of one
                var popped2 = t2.pop();
                var popped1_1 = t1.pop();
                var popped1_2 = t1.pop();
                t4.push({
                    "numStudents": popped2.numStudents+":"+popped1_1.numStudents+":"+popped1_2.numStudents,
                    "student1": popped2.student1,
                    "student2": popped2.student2,
                    "student3": popped1_1.student1,
                    "student4": popped1_2.student1,
                    "preferenceList": popped2.preferenceList
                });
            }
            else { //you have only one team of 2 left so we break it into teams of 1
                var popped2 = t2.pop();
                t1.push({
                    "numStudents": popped2.numStudents + "(s1)",
                    "student1": popped2.student1,
                    "preferenceList": popped2.preferenceList
                });
                t1.push({
                    "numStudents": popped2.numStudents + "(s2)",
                    "student1": popped2.student2,
                    "preferenceList": popped2.preferenceList
                });
            }
        }
        while(t1.length!=0){
            if(t1.length>3){
                var popped1_1= t1.pop();
                var popped1_2= t1.pop();
                var popped1_3= t1.pop();
                var popped1_4= t1.pop();
                t4.push({
                    "numStudents": popped1_1.numStudents+":"+popped1_2.numStudents+":"+popped1_3.numStudents+":"+popped1_4.numStudents,
                    "student1": popped1_1.student1,
                    "student2": popped1_2.student1,
                    "student3": popped1_3.student1,
                    "student4": popped1_4.student1,
                    "preferenceList": popped1_1.preferenceList
                });
            }else{
                while(t1.length!=0){
                    unassigned_student_names.push(t1.pop().student1);
                }
            }
        }



        function removeTeams(callback) {
            GeneratedTeams.remove({},function(err, removed){
            });

        }


        operations = [];

        function addTeam(index) {
            t4[index].teamNumber = index;
            const generatedTeam = new GeneratedTeams({
                teamNumber: index,
                assignedProject: "unassigned",
                numStudents: t4[index].numStudents,
                student1: t4[index].student1,
                student2: t4[index].student2,
                student3: t4[index].student3,
                student4: t4[index].student4,
                preferenceList: t4[index].preferenceList
            });
            generatedTeam.save();
        }

        operations.push(removeTeams);
        for (var i = 0; i < t4.length; i++) {
            operations.push(addTeam(i));
        }

        async.series(operations, function (err, results) {

        });

        if(t4.length==numTeamsOf4){
            canGenerateMapping = true;
        }

    }).then(function() {

        res.render('instructor/generatedTeams', {
            title: 'Generated Teams of 4',
            generatedTeams: t4,
            unassigned_student_names: unassigned_student_names,
            canGenerateMapping: canGenerateMapping,
            numOfGeneratedTeams: t4.length,
            numNeededTeams: numTeamsOf4
        });
    });
};

/**
 * GET /instructor/compute-team-mapping-to-projects
 * Allows you to compute-team-mapping-to-projects
 */
exports.getTeamMappingToProjects = (req, res) => {

    /*
    The Stable marriage Algorithm is used below to map the teams to projects.

    Here is the basic algorithm:
     function stableMatching {
     Initialize all m ∈ M and w ∈ W to free
     while ∃ free man m who still has a woman w to propose to {
     w = first woman on m’s list to whom m has not yet proposed
     if w is free
     (m, w) become engaged
     else some pair (m', w) already exists
     if w prefers m to m'
     m' becomes free
     (m, w) become engaged
     else
     (m', w) remain engaged
     }
     }

     in our implementation the set of student generated teams is the set M from the above algorithm and the set of projects
     is the set W from the algorithm. Since projects don't have a preference list of student teams thus each project
     preference list is randomely generated.
    */

    var numTeams = numTeamsOf4;
    var pRankList = new Array(numTeams);  //randomizing project rank order of teams

    /*pRankList[0]=[1, 3, 2, 0];    //test configeration
    pRankList[1]=[2, 0, 3, 1];
    pRankList[2]=[1, 2, 3, 0];
    pRankList[3]=[0, 1, 3, 2];*/

    for(var i=0; i<numTeams; i++){ //randomizing project rank order of teams
        var randArr = new Array();
        for(var j=0; j<numTeams; j++){
            randArr.push(j);
        }
        for (var j=0; j<numTeams; j++){
            var rand = Math.floor(Math.random() * numTeams);
            var temp = randArr[j];
            randArr[j] = randArr[rand];
            randArr[rand] = temp;
        }

        pRankList[i]=randArr;

        /*var s = "[";
        for(var j=0; j<numTeams; j++){
            s+=randArr[j]+", ";
        }
        console.log(s);*/
    }

    var tRankList = new Array(numTeams);  //will contain team rank order of projects

    var tFree = new Array();    //will contain free teams
    var pPariedTo = new Array();   //will contain paring of projects to teams (index= project, value=team#) -1 means project is free

    for(var i=0; i<numTeams; i++){ //initalizing all teams to be free and project paring to be free
        tFree.push(i);
        pPariedTo.push(-1); //-1 means the project is free
    }

    var finalMapping = new Array();

    GeneratedTeams.find({}).then(function(result) {

        result.forEach(function(x){ //building up team preference list in reverse order to take advantage of pop function later on
            var i = parseInt(x.teamNumber);
            //console.log(i);
            tRankList[i] = new Array();
            for(var j=0; j<numTeams; j++){
                tRankList[i][numTeams-j-1] = x.preferenceList.charCodeAt((j*2)) - 97;
                //console.log(tRankList[i][numTeams-j-1]);
            }
        });

        while(tFree.length!=0){ //while there are free teams map the teams
            for(var i=0;i<tFree.length;i++){ //going through all the free teams
                var currTeamNumber = tFree[i];
                var currTeamsNextPreference = tRankList[currTeamNumber].pop();  //getting the next preference
                //var isNextPreferenceFree = false;
                var nextPreferenceIsPairedTo = pPariedTo[currTeamsNextPreference];  //getting who the preference is paired to
                //console.log(currTeamsNextPreference);

                if(nextPreferenceIsPairedTo==-1){ // next preferenc is not paired
                    pPariedTo[currTeamsNextPreference] = currTeamNumber;  //updating pPairedTo include new pairing
                    tFree.splice(i,1); //removing team i from free teams
                }else{
                    var nextPreferencesRankList = pRankList[currTeamsNextPreference];
                    if(nextPreferencesRankList.indexOf(nextPreferenceIsPairedTo)>nextPreferencesRankList.indexOf(currTeamNumber)){ //if next preference prefers current team more than the team its paird to
                        tFree[i] = nextPreferenceIsPairedTo;  // the paired team becomes free
                        pPariedTo[currTeamsNextPreference] = currTeamNumber; //the current team is paired to this project
                    }

                }

            }
        }

        for(var i=0; i<pPariedTo.length; i++){
            finalMapping[i] = "Project " + String.fromCharCode(97 + i) + " is assigned to team "+ pPariedTo[i];
        }


        res.render('instructor/teamMappingToProjects', {
            title: 'Team Mapping To Projects',
            finalMapping: finalMapping
        });
    });
};

/**
 * GET /instructor/email-authentication
 * Submit your GMail OAuth2 credentials
 */
exports.getEmailAuthentication = (req, res) => {
    res.render('instructor/addEmailAuthentication',{
        title: 'Submit OAuth2 email credentials'
    });
};
/**
 * POST /instructor/email-authentication
 * Add the credentials to the database
 */
exports.postEmailAuthentication = (req, res) => {

    const credential = new Credential({
        //There will only ever be one credential. So set its id to 1
        emailAddress: req.body.emailAddress,
        clientID: req.body.clientID,
        clientSecret: req.body.clientSecret,
        refreshToken: req.body.refreshToken
    });

    //perform the following mongoose queries in series
    async.series([
        // Empty the credential collection
        function(callback) {
            Credential.remove({}, (err, credentials) => {
                if (err) return callback(err);
                callback();
            });
        },
        // Add in your credential
        function(callback) {
            credential.save((err) => {
                if (err) return callback(err);
                callback();
            });
        },
        // make sure that the transporter is up-to-date
        function(callback) {
            updateTransporter();
            callback();
        },
    ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, we let express handle it by calling the `next` function
        res.redirect('/instructor/test-authentication');
    });
};
/**
 * GET /instructor/test-authentication
 * Allows you to view current GMail OAuth2 credentials, and show test results
 */
exports.getTestAuthentication = (req, res) => {
    var testingResult = "";

    //perform the following functions in series
    async.series([
        // make sure that the transporter is up-to-date
        function(callback) {
            updateTransporter();
            callback();
        },
        // Test the connection
        function(callback) {
            transporter.verify(function(error, success) {
                if (error) {
                    testingResult = error;
                    console.log(error);
                } else {
                    testingResult = 'Server is ready to take our messages';
                    console.log(testingResult);
                }
                callback();
            });
        },
    ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err); //If an error occurred, we let express handle it by calling the `next` function
        Credential.findOne({}, (err, credential) => {
            if (err) return handleError(err);
            res.render('instructor/testEmailAuthentication', {
                title: 'Test Email Authentication',
                credential: credential,
                testingResult: testingResult
            });
        });
    });
};