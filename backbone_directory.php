<?php
/**
 * Plugin Name: Backbone Directory
 * Plugin URI:  http://wordpress.org/plugins
 * Description: An interactive Backbone Directory
 * Version:     0.9.1
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
define( 'backbone_DIRECTORY_VERSION', '0.9.2' );
define( 'backbone_DIRECTORY_URL',     plugin_dir_url( __FILE__ ) );
define( 'backbone_DIRECTORY_PATH',    dirname( __FILE__ ) . '/' );
define( 'backbone_TRANSIENT_HASH',    '0010024' );

// Kailey's API key. It's free and good for 1000 calls per day. Or get another one here: https://developer.forecast.io/register
define( 'backbone_DIRECTORY_FORECASTIO_APIKEY', 'eeb9e190650f8cf3b7328f2ae2986788' );

include( backbone_DIRECTORY_PATH . 'includes/wp-tlc-transients/tlc-transients.php' );
include( backbone_DIRECTORY_PATH . 'includes/directory_setup.php' );
/**
 * Default initialization for the plugin:
 * - Registers the default textdomain.
 */
function backbone_directory_init() {
	$locale = apply_filters( 'plugin_locale', get_locale(), 'backbone_directory' );
	load_textdomain( 'backbone_directory', WP_LANG_DIR . '/backbone_directory/backbone_directory-' . $locale . '.mo' );
	load_plugin_textdomain( 'backbone_directory', false, backbone_DIRECTORY_URL . '/languages/' );

	register_post_type( 'backbonedirectory', array(
		'label'  => __( 'Backbone Directory', 'backbone_directory' ),
		'public' => true,
		'supports' => array( 'title', 'editor', 'custom-fields' )

		)
	);
	add_action( 'wp_ajax_backbone_load_directory_data', 'backbone_load_directory_data' );
	add_action( 'wp_ajax_backbone_insert_user', 'backbone_insert_user' );
	add_filter( 'json_prepare_post', function ($data, $post, $context) {
		$data['usermeta'] = array(
			'imgsrc'          => get_post_meta( $post['ID'], 'imgsrc', true ),
			'emailhash'       => get_post_meta( $post['ID'], 'emailhash', true ),
			'twittertxt'      => get_post_meta( $post['ID'], 'twittertxt', true ),
			'atendeeUrl'      => get_post_meta( $post['ID'], 'atendeeUrl', true ),
			'currentLocation' => get_post_meta( $post['ID'], 'currentLocation', true ),
			'aboutMe'         => get_post_meta( $post['ID'], 'aboutMe', true ),
		);
		return $data;
	}, 10, 3 );

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
			'importUsers'   => __( 'Import Backbone Users', 'backbone_directory' ),
			'closeImporter' => __( 'Close Importer', 'backbone_directory' ),
			'results'       => __( 'Results:', 'backbone_directory' ),
			'restAPI'       => site_url() . '/wp-json/',
			'localUsers'    => __( 'Local Users: ', 'backbone_directory' ),
			'insertnonce'   => wp_create_nonce( 'insertbackboneuser' ),
			)
		);
	wp_localize_script( 'backbone_directory_settings', 'directoryPageHTML', bd_get_directory_html() );

	wp_enqueue_style( 'styles', backbone_DIRECTORY_URL . 'assets/css/backbone_directory.css' );


}

/**
 * Get the gravatar data for a specific gravatar hash, with caching
 */
function get_gravatar_data( $emailHash ) {

	if ( '' === $emailHash ) {
		return '';
	}

	$gravatar_transient_key = 'gtk_' . $emailHash;
	if ( false === ( $gdata = get_transient( $gravatar_transient_key ) ) ){
		$url = 'http://en.gravatar.com/' . sanitize_key( $emailHash ) . '.json';

		$gdata = json_decode( wp_remote_retrieve_body( wp_remote_get( $url ) ) );
	}

	return $gdata;

}

/**
 * Ajax callback to insert a new user
 */
function backbone_insert_user() {
	check_ajax_referer( 'insertbackboneuser' );
	global $wpdb;

	// Reset the data?
	if ( isset( $_POST['restart'] ) && '1' === $_POST['restart'] ) {
		$query = "
			DELETE FROM wp_posts
			WHERE post_type = 'backbonedirectory'
			";

		$wpdb->query($query);
	}

	$userdata = $_POST[ 'userdata' ];
	// Get the gravatar data if available
	if ( isset( $userdata[ 'emailhash'] ) ) {
		$gravatar_data = get_gravatar_data( $userdata[ 'emailhash'] );
		var_dump($gravatar_data->entry[0]);
		$gdata = $gravatar_data->entry[0];
		$userdata[ 'aboutMe' ] = isset( $gdata->aboutMe ) ? $gdata->aboutMe : '';
		$userdata[ 'currentLocation' ] = isset( $gdata->currentLocation ) ? $gdata->currentLocation : '';
	}



	$newpost = wp_insert_post( array(
		'post_title'  => esc_attr( $userdata[ 'name' ] ),
		'post_type'   => 'backbonedirectory',
		'post_status' => 'publish',
		) );
	add_post_meta(
		$newpost,
		'imgsrc',
		isset( $userdata[ 'imgsrc' ] ) ? sanitize_text_field( $userdata[ 'imgsrc' ] ) : '',
		true
	);
	add_post_meta(
		$newpost,
		'emailhash',
		isset( $userdata[ 'emailhash' ] ) ? sanitize_text_field( $userdata[ 'emailhash' ] ) : '',
		true
	);
	add_post_meta(
		$newpost,
		'twittertxt',
		isset( $userdata[ 'twittertxt' ] ) ? sanitize_text_field( $userdata[ 'twittertxt' ] ) : '',
		true
	);
	add_post_meta(
		$newpost,
		'atendeeUrl',
		isset( $userdata[ 'atendeeUrl' ] ) ? sanitize_text_field( $userdata[ 'atendeeUrl' ] ) : '',
		true
	);
	add_post_meta(
		$newpost,
		'aboutMe',
		isset( $userdata[ 'aboutMe' ] ) ? sanitize_text_field( $userdata[ 'aboutMe' ] ) : '',
		true
	);
	add_post_meta(
		$newpost,
		'currentLocation',
		isset( $userdata[ 'currentLocation' ] ) ? sanitize_text_field( $userdata[ 'currentLocation' ] ) : '',
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
