<?php
/**
 * Plugin Name: Backbone Directory
 * Plugin URI:  http://wordpress.org/plugins
 * Description: An interactive Backbone Directory
 * Version:     0.9.3
 * Author:      Adam Silverstein
 * Author URI:
 * License:     GPLv2+
 * Text Domain: backbone_directory
 * Domain Path: /languages
 */

/**
 * Copyright (c) 2014 Adam Silverstein (email : adam@10up.com)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

/**
 * Built using grunt-wp-plugin
 * Copyright (c) 2013 10up
 * https://github.com/10up/grunt-wp-plugin
 */

// Useful global constants
define( 'backbone_DIRECTORY_VERSION', '0.9.3' );
define( 'backbone_DIRECTORY_URL',     plugin_dir_url( __FILE__ ) );
define( 'backbone_DIRECTORY_PATH',    dirname( __FILE__ ) . '/' );
define( 'backbone_TRANSIENT_HASH',    '0010024' );

// Kailey's API key. It's free and good for 1000 calls per day. Or get another one here: https://developer.forecast.io/register
define( 'backbone_DIRECTORY_FORECASTIO_APIKEY', 'eeb9e190650f8cf3b7328f2ae2986788' );

define( 'IMPORT_URL', 'http://2014.nyc.wordcamp.org/attendees/' );

include( backbone_DIRECTORY_PATH . 'includes/wp-tlc-transients/tlc-transients.php' );
include( backbone_DIRECTORY_PATH . 'includes/directory_setup.php' );
/**
 * Default initialization for the plugin:
 * - Registers the default textdomain.
 */
function backbone_directory_init() {
	get_data_from_google_doc();
	$locale = apply_filters( 'plugin_locale', get_locale(), 'backbone_directory' );
	load_textdomain( 'backbone_directory', WP_LANG_DIR . '/backbone_directory/backbone_directory-' . $locale . '.mo' );
	load_plugin_textdomain( 'backbone_directory', false, backbone_DIRECTORY_URL . '/languages/' );

	register_post_type( 'backbonedirectory', array(
		'label'  => __( 'Backbone Directory', 'backbone_directory' ),
		'public' => true,
		'supports' => array( 'title', 'editor', 'custom-fields' ),
		)
	);
	add_action( 'wp_ajax_backbone_load_directory_data', 'backbone_load_directory_data' );
	add_action( 'wp_ajax_backbone_insert_user', 'backbone_insert_user' );
	add_filter( 'json_prepare_post', function ( $data, $post, $context ) {
		$data[ 'usermeta' ] = array(
			'imgsrc'     => get_post_meta( $post['ID'], 'imgsrc', true ),
			'emailhash'  => get_post_meta( $post['ID'], 'emailhash', true ),
			'twittertxt' => get_post_meta( $post['ID'], 'twittertxt', true ),
			'atendeeUrl' => get_post_meta( $post['ID'], 'atendeeUrl', true ),
		);
		return $data;
	}, 10, 3 );

	// Allow offset parameter
	// @todo limit the filter to just our cpt
	add_filter( 'json_query_vars', function( $vars ){
		array_push( $vars, 'offset' );
		return $vars;
			});
}

add_action('admin_enqueue_scripts', 'bacbkbone_admin_enqueue_scripts');
function bacbkbone_admin_enqueue_scripts( $arg ) {
	$screen = get_current_screen();
	if ( $screen->id != "edit-backbonedirectory" ) { // Only add to users.php page
		return;
	}

	wp_enqueue_script(
		'backbone_directory_settings',
		backbone_DIRECTORY_URL . 'assets/js/src/bbsettings.js',
		array( 'underscore' ),
		'0.0.0.1',
		false
	);

	wp_localize_script(
		'backbone_directory_settings',
		'bbSettings',
		array(
			'importUsers'       => __( 'Import Backbone Users', 'backbone_directory' ),
			'closeImporter'     => __( 'Close Importer', 'backbone_directory' ),
			'results'           => __( 'Results:', 'backbone_directory' ),
			'restAPI'           => site_url() . '/wp-json/',
			'localUsers'        => __( 'Local Users: ', 'backbone_directory' ),
			'insertnonce'       => wp_create_nonce( 'insertbackboneuser' ),
			'importurl'         => IMPORT_URL,
			'atendeePageScrape' => 'Scrape WordCamp atendee page:',
			'importGoogleDoc'   => 'Import from Google doc:',
			'gdockey'           => 'Google document key',
			'gusername'         => 'Google username',
			'gpassword'         => 'Google password',
			)
		);

	$cached_transient_key = 'backbone_directory_directory_data_b_' . backbone_TRANSIENT_HASH;

	if ( false === ( $directory_html = get_transient( $cached_transient_key ) ) ) {
 		error_log( 'blank cache' );
		// force a new get
		$directory_html =  bd_get_directory_html();
		set_transient( $cached_transient_key, $directory_html, DAY_IN_SECONDS );
	} else {
		error_log( 'using cached copy' );
	}

	if ( '' !== $directory_html ) {
		wp_localize_script( 'backbone_directory', 'directoryPageHTML', $directory_html );
	}

	wp_enqueue_style( 'styles', backbone_DIRECTORY_URL . 'assets/css/backbone_directory.css' );


}

/**
 * Get Data from google doc
 */
function get_data_from_google_doc() {

	$glogin    = "adam.silverstein@get10up.com";
	$gpassword = "9MZ0eMarWv3ZmkWOrVFBANQatnl3Oy";
	$gkey      = "0Agybh5H-DfZ3dEhfRDhSdXhGVUVub1doY3NVaFppaFE";

	$keyquery  = 'https://www.google.com/accounts/ClientLogin?Email=' . $glogin . '&Passwd=' . $gpassword . '&accountType=GOOGLE&service=wise';
	$keydata   = wp_remote_retrieve_body( wp_remote_get( $keyquery ) );
	$authpos   = strpos( $keydata, 'Auth=' );
	$keydata   = substr( $keydata, $authpos );//, $lsidpos - $authpos - 1 );
	$sheeturl  = 'https://spreadsheets.google.com/feeds/cells/0Agybh5H-DfZ3dEhfRDhSdXhGVUVub1doY3NVaFppaFE/od6/private/full';
	$headers   = array( 'Authorization' => 'GoogleLogin ' .  $keydata, 'GData-Version' => 2, 'format' => 'xml' );
 	$sheetdata = wp_remote_retrieve_body( wp_remote_get( $sheeturl, array( 'headers' => $headers ) ) );
	$xml       = new SimpleXMLElement( $sheetdata );
	$max       = 14;
	$the_row   = -1; /* Start with -1 because this gets bumped immediately to 0 on the 1st iteration */
	$user_data = array();
	$fields    = array();

	foreach ( $xml->entry as $entry ) {
		//var_dump($entry);
		$attributes = (string) $entry->{"content"};
		$originaltitle = $title = (string) $entry->{"title"};

		// If this is the first row of data, its the column titles
		// Grab the number part of the column name
		$column = letter_to_number( preg_replace( '/[0-9]/', '', $title ) ) - 1;

		// Every row must have a column 1!
		if ( 0 === $column ) {
			// First column, so bump the row
			$the_row++;
			//echo '<br />';
		}

		// The first row is just the field names
		if ( 0 === $the_row ) {
			$fields[    $column ] = $attributes;
			//var_dum  p($user_data);
			//echo $column . ' - ' . $attributes . ' == ' . $originaltitle . '; ';
		} else {
			$user_data[ $the_row ][ $column ] = $attributes;
		}

	}

	//var_dump($user_data);
}

/**
 * Ajax callback to insert a new user
 */
function backbone_insert_user() {
	check_ajax_referer( 'insertbackboneuser' );

	$userdata = $_POST[ 'userdata' ];

	$newpost = wp_insert_post( array(
		'post_title'  => esc_attr( $userdata[ 'name' ] ),
		'post_type'   => 'backbonedirectory',
		'post_status' => 'publish',
		) );
	add_post_meta(
		$newpost,
		'imgsrc',
		$userdata[ 'imgsrc' ],
		true
	);
	add_post_meta(
		$newpost,
		'emailhash',
		$userdata[ 'emailhash' ],
		true
	);
	add_post_meta(
		$newpost,
		'twittertxt',
		$userdata[ 'twittertxt' ],
		true
	);
	add_post_meta(
		$newpost,
		'atendeeUrl',
		$userdata[ 'atendeeUrl' ],
		true
	);

	wp_send_json_success( $newpost );

}


/**
 * Ajax callback to load the directory data
 */
function backbone_load_directory_data() {

}

/**
 * Activate the plugin
 */
function backbone_directory_activate() {
	// First load the init scripts in case any rewrite functionality is being loaded
	backbone_directory_init();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'backbone_directory_activate' );

/**
 * Deactivate the plugin
 * Uninstall routines should be in uninstall.php
 */
function backbone_directory_deactivate() {

}
register_deactivation_hook( __FILE__, 'backbone_directory_deactivate' );

// Wireup actions
add_action( 'init', 'backbone_directory_init' );

// Wireup filters

// Wireup shortcodes
