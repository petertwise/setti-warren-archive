/* ----------
Copyright (C) Peter T. Wise (D.B.A. Square Candy Design) - All Rights Reserved
Unauthorized copying of this file, via any medium is strictly prohibited
Proprietary and confidential
Written by Peter Wise <peter@squarecandy.net>, March 1, 2018
---------- */


function delete_null_properties(test, recurse) {
	for (var i in test) {
		if ( test[i] === null || test[i] === "Unknown" || test[i] === undefined || test[i] === "undefined" || test[i].length === 0 ) {
			delete test[i];
		} else if (recurse && typeof test[i] === 'object') {
			delete_null_properties(test[i], recurse);
		}
	}
}

jQuery(document).ready(function($){

	$('#rsvp-form').on('submit', function(e) {
		e.preventDefault();
		if ($("#rsvp-form").valid()) {
			// form is valid, move to the next step

			// disable the submit button and add a "processing" message/spinner
			$('#rsvp-submit').prop("disabled", true).after('<div class="processing"><i class="fa fa-spin fa-spinner"></i> processing, please wait...</div>');

			var signupdata = {};
			var persondata = {};

			signupdata.event = {
				"eventId": $('#eventid').val()
			};
			signupdata.shift = {
				"eventShiftId": $('#eventshiftid').val()
			};
			signupdata.role = {
				"roleId": $('#roleid').val()
			};
			signupdata.status = {
				"statusId": DATA.votebuilder_status
			};
			signupdata.location = {
				"locationId": $('#locationid').val()
			};

			persondata.firstname = $('#firstname').val();
			persondata.lastname = $('#lastname').val();

			persondata.emails = [{
				"email": $('#email').val()
			}];
			if ( $('#phone').val() ) {
				persondata.phones = [{
					"phoneNumber": $('#phone').val().replace(/\D/g,''),
					"phoneType": "C",
				}];
			}
			if ( $('#zip').val() || $('#city').val() ) {
				persondata.addresses = [{
					"addressLine1": $('#address').val(),
					"city": $('#city').val(),
					"stateOrProvince": $('#state').val(),
					"zipOrPostalCode": $('#zip').val(),
				}];
			}

			if (DATA.wp_debug) console.log(signupdata, persondata);

			function ajaxError(response) {
				$('.processing').slideUp(500, function(){ $('.processing').remove() });
				$('#rsvp-submit').prop("disabled", false);
				if (DATA.wp_debug) console.log(response);
				$('.submit-container').after('<div class="alert alert-danger">' + DATA.failure +
					'<br><br><small>' + response.status + ' - ' + response.statusText + '</small></div>');
			}
			// Attempt to find person record in MyCampaign
			// Check if the person exists in MyVoters
			$.ajax({
				url : DATA.ajax_url,
				type : 'post',
				data : {
					action : 'ngpvan_people_find_mycampaign',
					security: DATA.ajax_nonce,
					vandata : persondata
				},
				success : function( response ) {
					if (DATA.wp_debug) console.log('ngpvan_people_find_mycampaign response',response);
					// no match / error
					// If VoteBuilder API looks but can't find a match, the response will contain "Unmatched"
					// If VoteBuilder API was not given enough data it may return an error containing the string "Sorry, there was an error".
					if ( response.indexOf('Unmatched') !== -1 || response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
						if (DATA.wp_debug) console.log('No Match in MyCampaign');
						responsedata = false;
						// if not found in MyCampaign, look in MyVoters
						find_in_myvoters(signupdata, persondata);
					}
					else {
						responsedata = JSON.parse(response);
						if (DATA.wp_debug) console.log('MyCampaign Match', responsedata);
						// if found, get the vanId for this person, add to the signup data
						signupdata.person = {"vanId": responsedata.vanId};
						add_signup(signupdata, persondata);
					}
				},
				error : function( response ) { ajaxError(response) }
			});


			function find_in_myvoters(signupdata, persondata) {
				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'ngpvan_people_find_myvoters',
						security: DATA.ajax_nonce,
						vandata : persondata
					},
					success : function( response ) {
						console.log('ngpvan_people_find_myvoters response',response);
						// no match / error
						// If VoteBuilder API looks but can't find a match, the response will contain "Unmatched"
						// If VoteBuilder API was not given enough data it may return an error containing the string "Sorry, there was an error".
						if ( response.indexOf('Unmatched') !== -1 || response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
							if (DATA.wp_debug) console.log('No Match in MyVoters');
							// not found in MyCampaign or MyVoters. Add new user to MyCampaign just with the data they entered.
							add_to_mycampaign(signupdata, persondata);
						}
						else {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('MyVoters Match', responsedata);
							// found the user in MyCampaign
							// update user data in MyCampaign
							update_mycampaign(signupdata, persondata, responsedata.vanId);
						}
					},
					error : function( response ) { ajaxError(response) }
				});
			}


			function update_mycampaign(signupdata, persondata, myvotersvanid) {
				// do the findOrCreate routine
				// use the data from MyVoters and the user entered data.
				if (DATA.wp_debug) console.log('update_mycampaign: ',signupdata, persondata);

				// Get the MyVoters data
				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'ngpvan_people_find_voter_address',
						security: DATA.ajax_nonce,
						vanid : myvotersvanid,
					},
					success : function( response ) {
						if (DATA.wp_debug) console.log('ngpvan_people_find_voter_address',response);

						// no match / error
						if ( response.indexOf('Unmatched') !== -1 || response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
							if (DATA.wp_debug) console.log('error getting full MyVoters data for vanId ' + myvotersvanid);
							// add to my campaign anyways.
							add_to_mycampaign(signupdata, persondata);
						}
						// success
						else {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('Success getting MyVoters data: ', responsedata);
							// Add the MyVoters data as a new MyCampaign person
							migrate_myvoters_to_mycampaign(signupdata, persondata, responsedata);
						}
					},
					error : function( response ) { ajaxError(response) }
				});
			}

			function migrate_myvoters_to_mycampaign(signupdata, persondata, myvotersdata) {

				if (DATA.wp_debug) console.log('migrate_myvoters_to_mycampaign', signupdata, persondata, myvotersdata);

				// cleanup the object given back to us from myvoters.
				delete myvotersdata.vanId;
				delete_null_properties(myvotersdata,true);
				if (DATA.wp_debug) console.log('myvoters data after cleaning: ', myvotersdata);

				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'ngpvan_people_add_mycampaign',
						security: DATA.ajax_nonce,
						vandata : myvotersdata
					},
					success : function( response ) {
						if (DATA.wp_debug) console.log('migrate_myvoters_to_mycampaign ngpvan_people_add_mycampaign response',response);

						// no match / error
						if ( response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
							if (DATA.wp_debug) console.log('error adding to MyCampaign');
							$('.processing').slideUp(500, function(){ $('.processing').remove() });
							$('#rsvp-submit').prop("disabled", false).after('<div class="alert alert-danger">' + DATA.failure + '</div>');
						}
						// success
						else {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('Added to MyCampaign', responsedata);
							// added the user successfully to my campaign
							persondata.vanId = responsedata.vanId;

							// add the signup and User Submitted data to the new person
							add_to_mycampaign(signupdata, persondata);
						}
					},
					error : function( response ) { ajaxError(response) }
				});

			}


			function add_to_mycampaign(signupdata, persondata) {
				// do the findOrCreate routine
				// use the data the user entered data only.
				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'ngpvan_people_add_mycampaign',
						security: DATA.ajax_nonce,
						vandata : persondata
					},
					success : function( response ) {
						if (DATA.wp_debug) console.log('ngpvan_people_add_mycampaign response',response);

						// no match / error
						if ( response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
							if (DATA.wp_debug) console.log('error adding to MyCampaign');
							$('.processing').slideUp(500, function(){ $('.processing').remove() });
							$('#rsvp-submit').prop("disabled", false);
							responsedata = JSON.parse(response);
							var errors = '';
							if ( responsedata.errors ) {
								responsedata.errors.forEach(function(item, index){
									errors += item.text;
									errors += '<br>';
								});
							}
							$('.submit-container').after('<div class="alert alert-danger">' + DATA.failure + '<br><br>' + errors + '</div>');
						}
						// success
						else {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('Added/Updated in MyCampaign', responsedata);
							// added the user successfully to my campaign
							// update signup data to use the MyCampaign VanID
							signupdata.person = {"vanId": responsedata.vanId};
							add_signup(signupdata, persondata);
						}
					},
					error : function( response ) { ajaxError(response) }
				});
			}

			function add_signup(signupdata, persondata) {
				// Add a new signup for the event
				if (DATA.wp_debug) console.log('signupdata: ',signupdata);
				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'ngpvan_new_signup',
						security: DATA.ajax_nonce,
						vandata : signupdata
					},
					success : function( response ) {
						console.log('ngpvan_new_signup response',response);
						// no match / error
						if ( response.indexOf('Sorry, there was an error') !== -1 || response.indexOf('errors') !== -1 ) {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('Signup Error', responsedata);
							$('.processing, .alert-danger').slideUp(500, function(){ $('.processing').remove() });
							var errors = '';
							if ( responsedata.errors ) {
								responsedata.errors.forEach(function(item, index){
									errors += item.text;
									errors += '<br>';
								});
							}
							$('#rsvp-submit').prop("disabled", false);
							$('.submit-container').after('<div class="alert alert-danger">' + DATA.failure + '<br><br>' + errors + '</div>');
						}
						else {
							responsedata = JSON.parse(response);
							if (DATA.wp_debug) console.log('Signup Add Success', responsedata);

							// Full process completed successfully!!!
							$('#rsvp-form').slideUp();
							$('#rsvp-form').after('<div class="alert alert-success">' + DATA.success + '</div>');
							send_user_thank_you(signupdata, persondata);
						}
					},
					error : function( response ) { ajaxError(response) }
				});
			}

			function send_user_thank_you(signupdata, persondata) {
				if (DATA.wp_debug) console.log('Send User Thank You Email', signupdata, persondata);
				$.ajax({
					url : DATA.ajax_url,
					type : 'post',
					data : {
						action : 'votebuilder_send_user_thank_you',
						security: DATA.ajax_nonce,
						signupdata : signupdata,
						persondata : persondata,
					},
					success : function( response ) {
						if (DATA.wp_debug) console.log('Send User Thank You Email Success', response);
					},
					error : function( response ) { ajaxError(response) }
				});
			}

		} // end if is valid
	});

	// Validation
	$("#rsvp-form").validate({
		rules: {
			"firstname" : "required",
			"lastname" : "required",
			"email" : {
				required: true,
				email: true
			},
		},
	});
	$.validator.methods.email = function( value, element ) {
		return this.optional( element ) || /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test( value );
	}
});
