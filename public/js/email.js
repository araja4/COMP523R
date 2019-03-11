function createTemplateButtons(templates){
    var html = "<span>";
    for (template of templates) {
        html += "<button id=\"" + template._id + "\" class=\"button-template btn btn-primary btn-sm\" type=\"button\">" + template.description + "</button>"
    }
    html += "</span>";
    return html;
}

$(document).ready(function() {
    //allRecipients is determined in STEP 1 on the web page based on category of client chosen
    var allRecipients;
    var clientType;
    var templates;
    //finalRecipients are the recipients selected in STEP 2 on the web page.
    var senderName = "";
    var finalRecipients = [];
    var finalSubject;
    var finalBody;

    $('#breadcrumb').append(createBreadcrumb());

    $.get('/api/emailTemplates').then(function(JSON) {
        templates = JSON;
        $('#emailTemplates').empty();
        $('#emailTemplates').append(createTemplateButtons(templates));
    });

    $(".pending").on("click", function(){
        $.get('/api/pendingProjects').then(function(JSON) {
            allRecipients = JSON;
            finalRecipients = [];
            clientType = "pending";
            $('#clientSelection').empty();
            $('#clientSelection').append(getClientHTML());
        });
    });
    $(".approved").on("click", function(){
        $.get('/api/approvedProjects').then(function(JSON) {
            allRecipients = JSON;
            finalRecipients = [];
            clientType = "approved";
            $('#clientSelection').empty();
            $('#clientSelection').append(getClientHTML());
        });
    });
    $(".rejected").on("click", function(){
        $.get('/api/rejectedProjects').then(function(JSON) {
            allRecipients = JSON;
            finalRecipients = [];
            clientType = "rejected";
            $('#clientSelection').empty();
            $('#clientSelection').append(getClientHTML());
        });
    });
    $(".deleted").on("click", function(){
        $.get('/api/deletedProjects').then(function(JSON) {
            allRecipients = JSON;
            finalRecipients = [];
            clientType = "deleted";
            $('#clientSelection').empty();
            $('#clientSelection').append(getClientHTML());
        });
    });

    //add or remove clients to finalRecipients on click
    $("#clientSelection").on('click', '.checkbox', function(){
        var id = this.id;
        for (var i = 0; i < allRecipients.length; i++) {
            if (id == allRecipients[i]._id) {
                if ($(this).is(':checked')) {
                    //box was checked. add to the finalRecipients
                    finalRecipients.push(allRecipients[i]);
                } else {
                    //box was unchecked. remove from the finalRecipients
                    for (var j = finalRecipients.length - 1; j>=0; j--) {
                        if (id == finalRecipients[j]._id) {
                            finalRecipients.splice(j,1);
                            return;
                        }
                    }
                }
                return;
            }
        }
    });
    //fill out the template form and get all final data in the right place
    $("#emailTemplates").on('click', '.button-template', function(){
        var id = this.id;
        var recipientTo = "";
        for (recipient of finalRecipients) {
            recipientTo += recipient.name + ", ";
        }
        $("#to").val(recipientTo);
        for (template of templates) {
            if (id == template._id) {
                $("#subject").val(template.subject);
                $("#message").val(template.body);
                finalSubject = template.subject;
                finalBody = template.body;
                return;
            }
        }
    });

    // append the json to a hidden field so that it is submitted with the form submission.
    // There may be a more direct way to do this?
    $("#email-form").submit(function(event) {
        finalSubject = $("#subject").val();
        finalBody = $("#message").val();
        senderName = $("#name").val();
        var json = JSON.stringify({finalRecipients: finalRecipients, finalSubject: finalSubject, finalBody: finalBody, senderName: senderName});
        $(this).append('<input type="hidden" id="hiddenData" name="data">');
        $("#hiddenData").val(json);
        return true;
    });

    //Generate the HTML for the progress tracker table. Right now, you would manually change this to add new columns
    function getClientHTML() {
        var html = "" +
            "<h3>Select " + clientType + " clients</h3>" +
            "<table class=\"table table-striped\">" +
            "<thead>" +
            "<tr>" +
            "<th>selected</th>" +
            "<th>Name</th>" +
            "<th>Project</th>" +
            "<th>sentApproval</th>" +
            "<th>sentDenial</th>" +
            "<th>sentDeletion</th>" +
            "<th>sentSchedule</th>" +
            "<tbody>";
        for (recipient of allRecipients) {
            html += "" +
            "<tr>" +
            "<th><input class=\"checkbox\" type=\"checkbox\" id=\"" + recipient._id +"\" value=\"" + recipient._id +"\"></th>" +
            "<th>" + recipient.name + "\n" +
            "<th>" + recipient.project + "</th>";
            if (recipient.sentApproval) {
                html += "<th><span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span></th>";
            } else {
                html += "<th><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></th>";
            };
            if (recipient.sentDenial) {
                html += "<th><span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span></th>";
            } else {
                html += "<th><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></th>";
            };
            if (recipient.sentDeletion) {
                html += "<th><span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span></th>";
            } else {
                html += "<th><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></th>";
            };
            if (recipient.sentPitchSchedule) {
                html += "<th><span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span></th>";
            } else {
                html += "<th><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></th>";
            };

        }
        return html
    };
});