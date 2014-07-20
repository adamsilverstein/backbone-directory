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
	load_plugin_textdomain( 'backbone_directory', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
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
