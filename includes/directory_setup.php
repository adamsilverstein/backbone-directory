<?php
/**
 * Fetch the remote directory page
 */
function bd_get_directory_html() {
	error_log( 'bd_get_directory_html ');
	$directory_remote_url = 'http://2014.nyc.wordcamp.org/attendees/';
	$attendee_page_html = wp_remote_retrieve_body( wp_remote_get( $directory_remote_url ) );
	return $attendee_page_html;
}

	// Add shortcode
add_shortcode( 'backbone_directory', 'displaybackbone_directory' );

function displaybackbone_directory(){
	if ( is_admin() ){
		return;
	}
	$cached_transient_key = 'backbone_directory_directory_data_b_' . backbone_TRANSIENT_HASH;

	// Use tlc transients to get the last cached data
	$directory_html = tlc_transient( $cached_transient_key )
		->updates_with( 'bd_get_directory_html' )
		->expires_in( DAY_IN_SECONDS )
		->get();

	if ( '' === $directory_html ) {
		error_log( 'blank cache' );
		// force a new get
		$directory_html = tlc_transient( $cached_transient_key )
			->updates_with( 'bd_get_directory_html' )
			->background_only()
			->get();

	}
	if ( '' === $directory_html ) {
			error_log('local data enqueue');
			wp_enqueue_script( 'local_data', backbone_DIRECTORY_URL . 'localdata.js', array( 'jquery' ), '1.0.0', true );

	}
	// Enqueue plugin JavaScript
	wp_enqueue_script( 'backbone_directory', backbone_DIRECTORY_URL . 'assets/js/src/backbone_directory.js', array( 'wp-backbone', 'hoverIntent' ), '1.0.0', true );

	// Enqueue plugin css & Dashicons
	wp_enqueue_style( 'styles', backbone_DIRECTORY_URL . 'assets/css/directory.css' );
	wp_enqueue_style( 'dashicons' );

	if ( '' !== $directory_html ) {
		wp_localize_script( 'backbone_directory', 'directoryPageHTML', $directory_html );
	}
?>

<div id="backbone_card" class="hidden"></div>
<div id="backbone_card_detail_container" class="hidden"></div>

<div id="backbone_grid-container" class="nothidden">
	<div class="backbone-search-line">
		<div id="backbone-person-count"><?php esc_html_e( 'Found: ') ?><span></span></div>
		<div id="backbone_search"></div>
	</div>
	<div id="backbone_grid"></div>
</div>

<script id="tmpl-backbone_person" type="text/html">
		<div class="backbone_person-card" tabindex=0 id="backbone_person-{{ data.ID }}">
			<# if ( 'undefined' !== typeof data.usermeta ) { #>
			<div class="backbone_person-gravatar">
				<img src="http://www.gravatar.com/avatar/{{ data.usermeta.emailhash }}"  width="64" height="64">
			</div>
			<# } #>
			<div class="backbone_person-name">
				<span>{{ data.title }}</span>
			</div>
			<# if ( 'undefined' !== typeof data.usermeta ) { #>
			<div class="backbone_person-twittertxt">
				<span>{{ data.usermeta.twittertxt }}</span>
			</div>
			<# } #>
		</div>
</script>

<script id="tmpl-backbone_person-search" type="text/html">
	<input id="backbone_person-search-field" type="text" placeholder="Search" value="{{ data }}">
</script>

<script id="tmpl-backbone_person_detail" type="text/html">
	<# if ( 'undefined' !== typeof data.usermeta ) { #>
		<div class="backbone_person_detail-card">
			<div class="backbone_person_detail-gravatar">
				<img src='http://www.gravatar.com/avatar/{{ data.usermeta.emailhash }}?s=128' width="128" height="128">
			</div>
			<a class="icon" href="{{ data.usermeta.twitterurl }}" target="_blank"></a>
			<a class="icon" href="{{ data.usermeta.atendeeUrl }}" target="_blank"></a>
			<div class="backbone_person_detail-name">
				<span>{{ data.title }}</span>
			</div>
			<a href="{{ data.usermeta.twitterurl }}" target="_blank">
				<div class="backbone_person_detail-twittertxt">
					<span>{{ data.usermeta.twittertxt }}</span>
				</div>
			</a>
			<div class="backbone_person_detail-aboutme">
				<span>{{ data.aboutMe }}</span>
			</div>
		</div>
	<# } #>
</script>


<?php
}
