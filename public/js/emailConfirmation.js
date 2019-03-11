$(document).ready(function() {

    console.log(subject);
    console.log(recipients);
    console.log(senderName);
    console.log(body);

    $('#breadcrumb').append(createBreadcrumb());

    $('.body').each(function(i,obj) {
        var id = obj.dataset.id;
        $(this).empty();
        $(this).append(personalizeEmail(body,getClientName(id)));
    });

    $('.mailTo').click(function(){
        var id = this.id;
        for (recipient of recipients) {
            if (recipient._id == id) {
                this.href = "mailto:" + recipient.email;
                this.href += "?subject=" + subject;
                this.href += "&body=" + encodeURIComponent(personalizeEmail(body, recipient.name));
            }
        }
    });

    $(".submit").submit(function(event) {
        //TODO: get the button statuses and send them to server for processing
        var emailCategory = getEmailCategory();
        var json = JSON.stringify({finalRecipients: recipients, finalSubject: subject, finalBody: body, senderName: senderName, emailCategory: emailCategory});
        $(this).append('<input type="hidden" id="hiddenData" name="data">');
        $("#hiddenData").val(json);
        return true;
    });

    //Helper functions
    function getEmailCategory() {
        var emailCategory = {Approve: false, Deny: false, Delete: false, Schedule: false};
        if ($('#Approve').hasClass("active")) {emailCategory.Approve = true;}
        if ($('#Deny').hasClass("active")) {emailCategory.Deny = true;}
        if ($('#Delete').hasClass("active")) {emailCategory.Delete = true;}
        if ($('#Schedule').hasClass("active")) {emailCategory.Schedule = true;}
        return emailCategory;
    }

    function getClientName(id) {
        for (recipient of recipients) {
            if (recipient._id == id) {
                return recipient.name;
            }
        }
    }
});



function personalizeEmail(message, clientName) {
    message = message.replace("{Client}", clientName);
    message = message.replace("{Instructor}", senderName);
    return message;
}