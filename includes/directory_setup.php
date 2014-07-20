<?php


function displaybackbone_directory(){
	if ( is_admin() ){
		return;
	}
	// Enqueue plugin JavaScript
	wp_enqueue_script( 'backbone_directory', backbone_DIRECTORY_URL . 'assets/js/src/backbone_directory.js', array( 'wp-backbone', 'hoverIntent' ), '1.0.0', true );
	$atendees_cache_key = 'bd_cache_attendees_transient' . backbone_TRANSIENT_HASH;


	// Misc utility scripts: textfill, masonry, wp-tlc-transients, localstorage
	wp_enqueue_script( 'textfill', backbone_DIRECTORY_URL . 'assets/js/vendor/jquery.textfill.min.js', array( 'jquery' ), '1.0.0', true );
	//wp_enqueue_script( 'localstorage', backbone_DIRECTORY_URL . 'assets/js/src/localstorage.js', array( 'jquery' ), '1.0.0', true );
	wp_enqueue_script( 'masonry' );

	//Enqueue plugin css
	wp_enqueue_style( 'styles', backbone_DIRECTORY_URL . 'assets/css/directory.css' );
	// Dashicons
	wp_enqueue_style( 'dashicons' );

	$cached_transient_key = 'backbone_directory_directory_data_' . backbone_TRANSIENT_HASH;
	$directory_html = tlc_transient( $cached_transient_key )
		->updates_with( 'bd_get_directory_html' )
		->expires_in( 60 * MINUTE_IN_SECONDS )
		->get();

	wp_localize_script( 'backbone_directory', 'directoryPageHTML', $directory_html );

	$_bd = array(
		'nonce' => wp_create_nonce( 'bd_cache_attendees_nonce' )
		);
	wp_localize_script( 'backbone_directory', '_bd', $_bd );
?>
<div id="backbone_directory_loading_overlay">
	<div id="backbone_directory_loading"></div>
</div>

<div id="backbone_card" class="hidden"></div>
<div id="backbone_card_detail_container" class="hidden"></div>

<div id="backbone_grid-container" class="nothidden">
	<div id="backbone_search"></div>
	<div id="backbone_grid"></div>
</div>


<script id="tmpl-backbone_person-search" type="text/html">
<# console.log( data ); #>
	<input id="backbone_person-search-field" type="text" placeholder="Search" value="{{ data }}">
</script>


<script id="tmpl-backbone_person" type="text/html">
		<div class="backbone_person-card" tabindex=0>
			<div class="backbone_person-gravatar"><img src="http://www.gravatar.com/avatar/{{ data.emailhash }}"  width="64" height="64"></div>
			<div class="backbone_person-name"><span>{{ data.name }}</span></div>
			<div class="backbone_person-twittertxt"><span>{{ data.twittertxt }}</span></div>
		</div>
</script>

<script id="tmpl-backbone_person_detail" type="text/html">
		<div class="backbone_person_detail-card">
			<div class="backbone_person_detail-gravatar"><img src='http://www.gravatar.com/avatar/{{ data.emailhash }}?s=128' width="128" height="128"></div>
			<a class="icon" href="{{ data.twitterurl }}" target="_blank"></a>
			<a class="icon" href="{{ data.atendeeurl }}" target="_blank"></a>
			<div class="backbone_person_detail-name"><span>{{ data.name }}</span></div>
			<a href="{{ data.twitterurl }}" target="_blank">
				<div class="backbone_person_detail-twittertxt">
					<span>{{ data.twittertxt }}</span>
				</div>
			</a>
			<div class="backbone-person-loading hidden">
			</div>
		</div>
</script>


<?php
}
// Add shortcode
add_shortcode( 'backbone_directory', 'displaybackbone_directory' );

/**
 * Fetch the remote directory page
 */
function bd_get_directory_html() {
	error_log( 'bd_get_directory_html ');
	$directory_remote_url = 'http://2014.nyc.wordcamp.org/attendees/';
	$attendee_page_html = wp_remote_retrieve_body( wp_remote_get( $directory_remote_url ) );
	return $attendee_page_html;
}

