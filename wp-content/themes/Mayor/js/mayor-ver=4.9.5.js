/* mayor.js
 * quick dirty javascript to allow interactivity within the theme
 * yotam 2017
 */


/* general use javascript */
(function($) {
    /* toggle the expandable content */
    $('.expandable-container').click(function(e) {
        var container = $(this);
        if (container.hasClass('expanded')) {
            container.removeClass('expanded');
            container.find(".expandable-button").html('Read More');
        } else {
            container.addClass('expanded');
            container.find(".expandable-button").html('Read Less');
        }
    });




    $("#signup-form").submit(function(e) {

        e.preventDefault();


        function highlightFormElement (e) {
            e.css("border", "2px solid rgba(200, 0, 0, 0.5)");
            window.setTimeout(function() {
                e.css("border", "");
            }, 500);
        }

        /* check if the page signup form comes from modal */
        var isModal = $("#myModal").length > 0;
        var $form = $(this);
        var formData = {};
        var formfields = ['firstname', 'lastname', 'email', 'zipcode', 'thoughts'];
        formfields.forEach(function(inputName) {
            formData[inputName] = $form.find(":input[name='" + inputName + "']").val();
        });
        if (isModal && ( formData['firstname'].length === 0 || 
                         formData['lastname'].length  === 0 ||
                         formData['email'].length     === 0 ||
                         formData['zipcode'].length   === 0)) {
            formfields.forEach(function(inputName) {
                var elem = $form.find(":input[name='" + inputName + "']");
                if (elem.val().length <= 0) {
                    highlightFormElement(elem);    
                }
            });
            return; 
        }

        /* add checkboxes */
        ['wantVolunteer', 'canHost', 'wantLawn', 'wantUpdate'].forEach(function(checkBoxName) {
            if ($form.find('input[name="' + checkBoxName + '"]').length > 0 && $form.find('input[name="' + checkBoxName + '"]').is(":checked")) {
                formData[checkBoxName + ''] = true;
            }
        });
        localStorage.setItem('signedUp', true);  
        $.ajax({
            url: "https://salty-wave-73447.herokuapp.com/",
            method: "POST", 
            data: formData, 
            success: function () { /* erase the button */ 
                $("#signup-submit").replaceWith("<div class='signup-complete'>Thank you for signing up!</div>");
                $("#signup-submit").replaceWith("<div class='signup-complete'>Thank you for signing up!</div>");
            }
        });

    });

    /* only show modal on first three times */
    $(document).ready(function() {

        var signedUp = Boolean(localStorage.signedUp);
        if (signedUp === undefined) {
            localStorage.setItem('signedUp', false);  
            $('#myModal').modal().show();
        } else if (signedUp === false) {
            $('#myModal').modal().show();
        }
    });
})(jQuery);


/* javascript to control the issues page */
(function($) {
    
    function getRidOfShowClasses() {
        $('.block-one').removeClass('show');        
    }

    $('.block-one').click(function(e) {
        getRidOfShowClasses();
        $(this).addClass('show');
        var blockContainer = $('.block-container');
        var blockContent = blockContainer.find('.block-content');
        var blockOneHtml = $(this).find('.block-one-content').html();
        blockContent.html(blockOneHtml)
        $('html, body').animate({
            scrollTop: blockContainer.offset().top
        }, 1000);
        blockContent.addClass('show');
        $('.block-two').click( function(e){
            $(this).toggleClass('show');

        })    
        
    
    })
    
})(jQuery);





