/*global window, bbSettings, document, console, directoryPageHTML, ajaxurl, jQuery */
(function($) {
	$( document ).ready( function() {
		var stepone, steptwo, localUsers, users;
		console.log( 'user script ' );
		$( '.add-new-h2' ).parent().after(
				' <div class="bbi-import"><div class="atendees-scrape"><b>' +
				bbSettings.atendeePageScrape + '</b><br /><input id="scrapeurl" name="scrapeurl" type="text" size="50" value="' +
				bbSettings.importurl +'">' +
				'<input type="button" value="' +
				bbSettings.importUsers + '" class="button" id="importUsers" ' +
				'name="importUsers">' +
				'</div><br />' +
				'<div class="gdoc-import"><b>' +
				bbSettings.importGoogleDoc + '</b>' +
				'<br /><input placeholder="'+
				bbSettings.gdockey + '" name="gdockey" id="gdockey" type="text" size="50" >' +
				'<br /><input placeholder="'+
				bbSettings.gusername + '" name="gusername" id="gusername" type="text" size="50" >' +
				'<br /><input placeholder="'+
				bbSettings.gpassword + '" name="gpassword" id="gpassword" type="text" size="50" >' +
				'<input type="button" value="' +
				bbSettings.importUsers + '" class="button" id="importUsersGDoc" ' +
				'name="importUsersGDoc">' +				'</div>'
				 );
		// Open Importer
		$( document ).on( 'click', '#importUsers', function() {
			console.log( 'import users' );
			$( this )
			.attr( 'value', bbSettings.closeImporter )
			.attr( 'id', 'closeImporter' )
			.parent().after( '<div class="backbone-user-importer">' +
				'<h3>' + bbSettings.importUsers + '</h3>' +
				'<span class="backbone-user-import-results">' + bbSettings.results + '<span><br />' + bbSettings.usersImported + '<span class="backbone-user-import-count"></span>' +
				'</div>' );

			var $results = $( '.backbone-user-import-results' );
			// Query the JSON REST API for the user count

			users = $( 'ul.tix-attendee-list li', $( directoryPageHTML ) );
			$results.append( '<br />' + bbSettings.localUsers + users.length );

			var sendUser = function( user, index ) {
				var $user = $( user ),
					atendeeUrl = $user.find( 'a.tix-attendee-url' ).attr( 'href' ),
					emailHash  = $user.find( 'img' ).attr ( 'src' ).match( /avatar\/(.*)\?.*/i )[1],
					userdata = {

						imgsrc     : $user.find( 'img' ).attr ( 'src' ),
						emailhash  : emailHash,
						name       : $user.find( '.tix-attendee-name' ).text().trim(),
						twitterurl : $user.find( 'a.tix-attendee-twitter' ).attr( 'href' ),
						twittertxt : $user.find( 'a.tix-attendee-twitter' ).text().trim(),
						atendeeUrl : atendeeUrl
					};

				return $.ajax({
						type: 'POST',
						url: ajaxurl,
						data: {
							'_ajax_nonce': bbSettings.insertnonce,
							'action':      'backbone_insert_user',
							'userdata':    userdata,
							'restart':       ( 0 === index ) ? '1' : ''
						}
					});

			};

			var processAllUsers = function( index ) {
				var user = sendUser( users[ index ], index );
				index++;
				user.always(function() {
					jQuery( '.backbone-user-import-results>span' ).text( ' ' + index );
					//if ( index < 5 ) {
						window.setTimeout( processAllUsers( index ), 500 );
					//}
				});
			};

			processAllUsers( 0 );

		});

		// Close Importer
		$( document ).on( 'click', '#closeImporter', function() {
			console.log( 'import users' );
			$( this )
			.attr( 'value', bbSettings.importUsers )
			.attr( 'id', 'importUsers' );
			$( '.backbone-user-importer' ).hide();
		} );




	});
})(jQuery);
