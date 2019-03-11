$(document).ready(function() {

    $('#message').hide();

    $('#add-times-button').on("click", function(e) {
        e.preventDefault();
        $('#available option:selected').each(function() {
            $('#added').append($(this));
        });
        $('#added option:contains("Chosen times will show up here...")').remove();
    });

    $('#remove-times-button').on("click", function(e) {
        e.preventDefault();
        $('#added option:selected').each(function() {
            $('#available').append($(this));
        });
        if( $('#added').has('option').length == 0 ) {
            $('#added').append($('<option>', {text: 'Chosen times will show up here...'}));
        }
    });

    $('#timeform').on("submit", function(e) {
        $('#added option:contains("Chosen times will show up here...")').remove();
        $('#added option').prop('selected', true);
        if( $('#added').has('option').length == 0 ) {
            e.preventDefault();
            $('#message').append($('<div class="alert alert-danger">You must select at least one time!</div>'));
            $('#message').fadeIn();
        }
    });

});