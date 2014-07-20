<?php
	$remote_data_transient_key = 'dir_remote_data_transient_key_m';
	if( false === ( $user_data = get_transient( $remote_data_transient_key ) ) ) {

		$use_local_file = true;

		if( $use_local_file ) {
			error_log( __( 'Directory loading.', 'backbone_directory' ) );
			if ( file_exists( $handle ) ) {

				$fp = fopen( $handle, 'r');
				while ( ( $data = fgetcsv( $fp, 1000, "\t" ) ) !== FALSE )
				{
					// geocode the zip codes
					$ziplnglat = '';
					$address = $data[4] . '%20' . $data[5] . '%20' . $data[6];
					if ( 'City%20State%20Zip Code' == $address ){
						continue;
					}
					$transient_key = 'backbone_directory_geo_g_' . sanitize_key( $data[6] );

					// delete_transient( $transient_key );
					if ( false === ( $ziplnglat = get_transient( $transient_key ) ) || '' == $ziplnglat ) {

						$request_url = 'http://maps.google.com/maps/api/geocode/json?address=' . $data[6] . '&sensor=false';
						//error_log( $request_url );

						$geocode = wp_remote_get( $request_url );
						$zipdata = json_decode( $geocode[ 'body' ] );
						if ( '' == $zipdata ){
							$request_url = 'http://maps.google.com/maps/api/geocode/json?address=' . $data[4] . '&sensor=false';
							$geocode = wp_remote_get( $request_url );
							$zipdata = json_decode( $geocode[ 'body' ] );
						}
						if (! isset( $zipdata->status ) ){
							continue;
						}
						error_log($zipdata->status);
						if ( 'OK' == $zipdata->status ) {
							$lat = $zipdata->results[0]->geometry->location->lat;
							$lng = $zipdata->results[0]->geometry->location->lng;
							$ziplnglat = array( $lat, $lng );

							//weather.
							$request_url = 'https://api.forecast.io/forecast/'. backbone_DIRECTORY_FORECASTIO_APIKEY .'/'. implode( ',', $ziplnglat );
							$request = wp_remote_get( $request_url );
							$body = json_decode( wp_remote_retrieve_body( $request ) );
							$conditions = "{$body->currently->summary} {$body->currently->temperature}ºF";
							$ziplnglat[] = $conditions || '';
						}
						set_transient( $transient_key, $ziplnglat, 90 * DAY_IN_SECONDS );
					}
					//error_log($ziplnglat == false);
					// $data[ 'conditions' ] = array_pop( $ziplnglat ); // can work if array length is always 3
					$data[ 'conditions' ] = isset( $ziplnglat[2] ) ? $ziplnglat[2] : '';
					// $data[ 'ziplnglat' ] = $ziplnglat; // can work if using array_pop above
					$data[ 'ziplnglat' ] = array_slice( $ziplnglat, 0, 2 );

					//error_log($data[10]);
					$data[ 'emailhash' ] = md5( strtolower( trim( $data[11] ) ) );
					// Ensure private data cleared
					$data[2] = '';
					$data[3] = '';
					$data[14] = '';
					$return[] = $data;
					usleep( 100000 );
				}
			fclose( $fp );
			//die;
			error_log( __( 'Directory loaded.', 'backbone_directory' ) );
			return $return;
			}
		}
		set_transient( $remote_data_transient_key, $user_data, HOUR_IN_SECONDS );
	}

	foreach ( $user_data as $data ) {
			//var_dump($data); die;
			// geocode the zip codes
			$ziplnglat = '';

			$address = $data[4] . '%20' . $data[5] . '%20' . $data[6];

			if ( 'City%20State%20Zip Code' == $address ){
				continue;
			}
			$transient_key = 'backbone_directory_geo_h_' . sanitize_key( $data[6] );

			// delete_transient( $transient_key );
			if ( false === ( $ziplnglat = get_transient( $transient_key ) ) || '' == $ziplnglat ) {

				$request_url = 'http://maps.google.com/maps/api/geocode/json?address=' . esc_url( $data[6] ) . '&sensor=false';
				//error_log( $data[6] );

				error_log( $request_url );
				$geocode = wp_remote_get( $request_url );
				$zipdata = json_decode( $geocode[ 'body' ] );
				if ( '' == $zipdata ){
					$request_url = 'http://maps.google.com/maps/api/geocode/json?address=' . $data[4] . '&sensor=false';
					$geocode = wp_remote_get( $request_url );
					$zipdata = json_decode( $geocode[ 'body' ] );
				}
				error_log($zipdata->status);
				if ( 'OK' == $zipdata->status ) {
					$lat = $zipdata->results[0]->geometry->location->lat;
					$lng = $zipdata->results[0]->geometry->location->lng;
					$ziplnglat = array( $lat, $lng );

					//weather.
					$request_url = 'https://api.forecast.io/forecast/'. backbone_DIRECTORY_FORECASTIO_APIKEY .'/'. implode( ',', $ziplnglat );
					$request = wp_remote_get( $request_url );
					$body = json_decode( wp_remote_retrieve_body( $request ) );
					$conditions = "{$body->currently->summary} {$body->currently->temperature}ºF";
					$ziplnglat[] = $conditions;

					set_transient( $transient_key, $ziplnglat, 90 * DAY_IN_SECONDS );

				}
			// wait for 1/10th seconds
			usleep( 100000 );
			}
			//error_log($ziplnglat == false);
			// $data[ 'conditions' ] = array_pop( $ziplnglat ); // can work if array length is always 3
			$data[ 'conditions' ] = isset( $ziplnglat[2] ) ? $ziplnglat[2] : '';
			// $data[ 'ziplnglat' ] = $ziplnglat; // can work if using array_pop above
			$data[ 'ziplnglat' ] = array_slice( $ziplnglat, 0, 2 );

			$data[ 'emailhash' ] = md5( strtolower( trim( $data[11] ) ) );
			// Ensure private data cleared
			$data[2] = ''; // remove phone from data
			$data[3] = ''; // remove street address from data
			$data[15] = ''; // remove hire date from data
			$return[] = $data;
		}

		error_log( __( 'Directory loaded.', 'backbone_directory' ) );
		return $return;
