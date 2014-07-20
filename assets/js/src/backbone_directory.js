/*global Backbone, jQuery, console, window, document, wp, Masonry, _, google, GMaps, directoryPageHTML, _wpUtilSettings, _bd, cachedAtendees */

/**
 * Backbone Directory
 * http://wordpress.org/plugins
 *
 * Copyright (c) 2014 Adam Silverstein
 * Licensed under the GPLv2+ license.
 */
window.wp = window.wp || {};

(function($) {
	$( document ).ready( function() {
	/* MODEL */

		/**
		 * The base person model
		 */
		var BackbonePerson = Backbone.Model.extend({

			initialize: function( singleData ) {

				if ( 'undefined' === typeof singleData ) {
					return;
				}

				this.set( {
								'name':       singleData.name,
								'imagesrc':   singleData.imagesrc,
								'emailhash':  singleData.emailhash,
								'twitterurl': singleData.twitterurl,
								'twittertxt': singleData.twittertxt,
								'atendeeurl': singleData.atendeeurl
							} );
			},

			toJSON : function() {
				return _.clone(this.attributes);
			}
		}),

	/* COLLECTION */

		/**
		 * Collection of people
		 */
		BackbonePersonCollection = Backbone.Collection.extend( {

			columnNames: null,
			search:      '',

			setup: function( args ){
				this.columnNames = args;
			},

			searchFor: function( search ) {
				console.log( 'backbone_personCollection:search ' );
				this.search = search;
				this.trigger( 'change' );
			}
		} ),

	/* VIEWS */

		/**
		 * The person display view - display the card of a single person
		 */
		BackbonePersonDisplay = wp.Backbone.View.extend({

			template:  wp.template( 'backbone_person' ),
			el:        '#backbone_card',

			initialize: function() {
				this.listenTo( this.model, 'change', this.render );
			},

			render: function() {
				this.$el.html( this.template( this.model.attributes ) );
				return this;
			}
		}),

		/**
		 * The person detail view
		 */
		BackbonePersonDetail = wp.Backbone.View.extend({

			template:  wp.template( 'backbone_person_detail' ),
			el:        '#backbone_card_detail_container',
			model: null,

			initialize: function( options ) {
				var self = this;
				this.backboneGrid   = options.backboneGrid;
				this.backbonePeople = options.backbonePeople;
				this.listenTo( this.backboneGrid, 'detailView', this.personDetail );
				$( document ).on( 'keyup', _.throttle( function( e ){
					self.keyPress( e );
				}, 250 ) );
			},

			showPersonDetailDialog: function() {
				// If the modal is hidden, fade it in
				if ( this.$el.is(':hidden') ) {
					this.$el.fadeIn();
				}
			},

			hidePersonDetailDialog: function() {
				this.$el.fadeOut( 'fast' );
			},

			goPrevious: function() {
				if ( ! this.hasPrevious() ) {
					return;
				}
				this.model = this.backbonePeople.at( this.backbonePeople.indexOf( this.model ) - 1 );
				this.render();
			},

			hasPrevious: function() {
				return ( this.getCurrentIndex() - 1 ) > -1;
			},

			getCurrentIndex: function() {
				return this.backbonePeople.indexOf( this.model );
			},

			goNext: function() {
				if ( ! this.hasNext() ) {
					return;
				}
				this.model = this.backbonePeople.at( this.getCurrentIndex() + 1 );
				this.render();
			},

			hasNext: function() {
				return ( this.getCurrentIndex() + 1 ) < this.backbonePeople.length;
			},

			keyPress: function( event ){
				console.log( 'keypress' );
				// Pressing the escape key closes the dialog
				if ( event.keyCode === 27 ) {
					this.hidePersonDetailDialog();
					return event;
				}
				if ( 13 === event.keyCode || 32 === event.keyCode ) { /* enter or space */
					$( event.target ).trigger( 'click' );
				}

				if ( this.$el.is(':hidden') ) {
					return;
				}
				if ( 39 === event.keyCode ) { /* right */
					_.once( this.goNext() );
				}
				if ( 37 === event.keyCode ) { /* left */
					_.once( this.goPrevious() );
				}
			},

			personDetail: function( person ) {
				console.log( 'personDetail' );
				var $person    = $( person.currentTarget ),
					name       = $person.find('.backbone_person-name').text();

				this.model = this.backbonePeople.findWhere( { 'name': name } );
				this.render();
			},

			render: function() {
				var self = this;

				console.log( 'BackbonePersonDetail render ' );
				this.$el.html( this.template( this.model.attributes ) );
				this.showPersonDetailDialog();
				return this;
			}
		}),

		/**
		 * The Search bar
		 */
		BackboneSearchbar = Backbone.View.extend({
			backbonePeople: null, /* the collection of backbonePeople */
			self:     this,
			el:       '#backbone_search',
			template: wp.template( 'backbone_person-search' ),
			search:   '',

			events: {
				'focus #backbone_person-search-field':  'searchFocus',
				'blur  #backbone_person-search-field':  'searchBlur'
			},

			searchChange: function( search ) {
				var searchFor = this.$el.find( search ).prop('value');
				console.log( 'searchchange ' + searchFor );
				this.backbonePeople.searchFor( searchFor );
			},

			searchFocus: function( search ) {
				this.$el.find( search.currentTarget ).css( 'color', '#000' );
			},

			searchBlur: function( search ) {
				this.$el.find( search.currentTarget ).css( 'color', '#aaa' );
			},

			initialize: function( options ) {
				var self = this,
					backboneRouter = options.backboneRouter;
				console.log( 'backbone_Searchbar.initialize ' );
				this.backbonePeople = options.backbonePeople;
				this.render();
				this.$el.on( 'keypress', '#backbone_person-search-field',_.debounce( function(){
					self.searchChange( this );
				}, 250 ) );
			},

			render: function() {
				var self = this;
				console.log( 'backbone_Searchbar:render ' );
				var templatehtml = this.template( this.search );
				this.$el.html( templatehtml );
				return this;
			}
		}),
		/**
		 * The Grid view - displays the directory grid
		 */
		BackboneGrid = wp.Backbone.View.extend({
			backbonePeople: null, /* the collection of backbonePeople */
			el:       '#backbone_grid',
			msnry:    null,
			template:  wp.template( 'backbone_person' ),

			events: {
				'click .backbone_person-card': 'clickackbonePerson'
			},

			clickackbonePerson: function( person ) {
				console.log( 'triggering personDetail' );
				this.trigger( 'detailView', person );
			},

			initialize: function( options ) {
				console.log( 'BackboneGrid.initialize' );
				this.backbonePeople = options.backbonePeople;
				this.backboneRouter = options.backboneRouter;
				this.listenTo( this.backbonePeople, 'change', this.searchChanged );
			},

			searchChanged: function() {
				_.debounce( this.adjustSearch(), 250 );
			},

			adjustSearch: function() {
				console.log( 'backbone_Grid:searchChanged'  );
				// If the search string is blank, don't include '?search=' string in navigation
				var navigateto = ( '' === this.backbonePeople.search ) ? '' : '?search=' + this.backbonePeople.search;
				this.backboneRouter.navigate( navigateto, { replace: true } );
				this.render();
			},

			render: function() {
				var self = this,
					gridmodels,
					search = this.backbonePeople.search.toLowerCase();
				console.log( 'backbone_Grid:render '  );
				if ( '' === search ) {
					gridmodels = this.backbonePeople.models;
				} else {
					gridmodels = _.filter( this.backbonePeople.models, function( theModel ) {
						return ( -1 !== theModel.get( 'name' ).toLowerCase().indexOf( search ) );
					} );
				}
				var newmodels = '', newEl = '';
				self.$el.html( '' );
				_.each( gridmodels, function( backbone_person ){
					//add the backbone_person to the grid
					newEl += self.template( backbone_person.attributes );
				} );
			self.$el.html( newEl );
			console.log( ' gridrender complete ' );

				console.log( $( window ).innerHeight() );
				//$( '#backbone_grid-container' ).height( $( window ).innerHeight() + 'px' );
				//return this;
			}
		}),

	/* ROUTER */

		/**
		 * Handle routing for the application
		 *
		**/
		BackboneRouter = Backbone.Router.extend({

			routes: {
				'?details=:name':  'openbackbonePerson',
				'?search=:search': 'performSearch'
			},

			baseURL: function() {
				return window.location.pathname;
			},

			openbackbonePerson: function( name ) {
				console.log( 'route: ' + name + ' ' );
				// find the model

				var theModel = BackboneDirectoryApp.backbonePeople.where({ 'name': name });

				BackboneDirectoryApp.backbonePersonDisp.model.set( theModel[0].attributes );
			},

			performSearch: function( s ) {
				console.log( 'Router::performSearch' );
				$( 'input#backbone_person-search-field' ).val( s ).trigger( 'keypress' ).select();
			}
		}),

	/* APPLICATION */

		/**
		 * The main application object
		 */
		BackboneDirectoryApp = {
			Views: {},
			Routers: {},
			Models: {},
			data: {},

			initialize: function() {
				var self = this, users;


				var imgsrc, gravhash, $loadcount = $( '#backbone_directory_loading_count' );

				self.backbonePeople = new BackbonePersonCollection( );
				users = $( 'ul.tix-attendee-list li', $( directoryPageHTML ) );

				_.each( users, function( singleData, index ) {
					var $this      = $( singleData ),
						data = {}, backbone_person;

						$loadcount.text( index );
						data.imgsrc     = $this.find( 'img' ).attr ( 'src' );
						data.emailhash  = data.imgsrc.match( /avatar\/(.*)\?.*/i )[1];
						data.name       = $this.find( '.tix-attendee-name' ).text().trim();
						data.twitterurl = $this.find( 'a.tix-attendee-twitter' ).attr( 'href' );
						data.twittertxt = $this.find( 'a.tix-attendee-twitter' ).text().trim();
						data.atendeeurl = $this.find( 'a.tix-attendee-url' ).attr( 'href' );

					backbone_person = new BackbonePerson( data );
					self.backbonePeople.add( backbone_person );
				} );

				self.backboneRouter = new BackboneRouter();

				self.backbonePersonDisp = new BackbonePersonDisplay( {
					model: new BackbonePerson()
				});
				var options = {
						'backbonePeople': self.backbonePeople,
						'backboneRouter': self.backboneRouter
						};
				var grid       = new BackboneGrid( options ),
					searchBar  = new BackboneSearchbar( options ),
					detailView = new BackbonePersonDetail( _.extend(
						options, {
							'backboneGrid': grid,
							model: new BackbonePerson()
						} ) );

				grid.render();

				$( window ).on( 'resize', _.debounce( function() {
					var wide = $( this ).innerWidth() ;
					$( '#backbone_grid-container' ).height( $( this ).innerHeight() + 'px' );
					$( '#backbone_grid-container' ).width( wide + 'px' );
				}, 150 ) );

				Backbone.history.start( {
					pushState: true,
					root:      window.location.pathname
					} );
			}
		};

		BackboneDirectoryApp.initialize();
	});
})(jQuery);