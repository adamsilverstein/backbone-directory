/*global Backbone, jQuery, console, window, document, wp, Masonry, _, google, GMaps, directoryPageHTML, _wpUtilSettings */

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

			initialize: function() {

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
		BackbonePersonDisplay = Backbone.View.extend({

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
		BackbonePersonDetail = Backbone.View.extend({

			template:  wp.template( 'backbone_person_detail' ),
			el:        '#backbone_card_detail_container',
			model: null,

			initialize: function( options ) {
				var self = this;
				this.backboneGrid   = options.backboneGrid;
				this.backbonePeople = options.backbonePeople;
				this.backboneRouter = options.backboneRouter;
				this.listenTo( this.backboneGrid, 'detailView', this.personDetail );
				$( document ).on( 'keyup', _.throttle( function( e ){
					self.keyPress( e );
				}, 250 ) );
			},

			// Find and set the person who was just triggered
			personDetail: function( person ) {
				console.log( 'personDetail' );
				var $person    = $( person.currentTarget ),
					name       = $person.find('.backbone_person-name>span').text();

				this.model = this.backbonePeople.findWhere( { 'title': name } );
				this.render();

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

			getCurrentIndex: function() {
				return this.backbonePeople.indexOf( this.model );
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

			render: function() {
				var self = this;
				this.backboneRouter.navigate( '?details=' + this.model.get( 'name' ), { replace: false } );

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

			events: {
				'keypress #backbone_person-search-field':  'searchChange'
			},

			searchChange: function( search ) {
				var searchFor = this.$el.find( search ).prop('value');
				console.log( 'searchchange ' + searchFor );
				this.backbonePeople.searchFor( searchFor );
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
		BackboneGrid = Backbone.View.extend({
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
				if ( 'undefined' === typeof this.backbonePeople.search ) {
					return;
				}
				// If the search string is blank, don't include '?search=' string in navigation
				var navigateto = ( '' === this.backbonePeople.search ) ? '' : '?search=' + this.backbonePeople.search;
				this.backboneRouter.navigate( navigateto, { replace: false } );
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

				self.$el.parent().find( '#backbone-person-count>span' ).html( gridmodels.length );

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
				BackboneDirectoryApp.personDetail.model = BackboneDirectoryApp.backbonePeople.where({ 'name': name })[0];
				BackboneDirectoryApp.personDetail.render();

			},

			performSearch: function( s ) {
				console.log( 'Router::performSearch' );
				$( 'input#backbone_person-search-field' ).val( s ).trigger( 'keypress' ).select();
				BackboneDirectoryApp.personDetail.hidePersonDetailDialog();
			}
		}),

	/* APPLICATION */

		/**
		 * The main application object
		 */
		BackboneDirectoryApp = {

			initialize: function() {
				var self = this, users, imgsrc, gravhash, fetched, fetched2,
					$loadcount = $( '#backbone_directory_loading_count' );

				self.backbonePeople = new BackbonePersonCollection( );
				self.backbonePeople.url = '/wp-json/posts?filter[posts_per_page]=1000&filter[order]=ASC&filter[offset]=22&type=backbonedirectory';

				fetched = self.backbonePeople.fetch();
				fetched.done( function( results ) {
					console.log( results );
					self.backboneRouter = new BackboneRouter();
					self.backbonePersonDisp = new BackbonePersonDisplay( {
						model: new BackbonePerson()
					});
					var options = {
							'backbonePeople': self.backbonePeople,
							'backboneRouter': self.backboneRouter
							};
					self.backboneGrid = new BackboneGrid( options );

					var	searchBar  = new BackboneSearchbar( options );
						self.personDetail = new BackbonePersonDetail( _.extend(
							options, {
								'backboneGrid': self.backboneGrid,
								model: new BackbonePerson()
							} ) );

					self.backboneGrid.render();
				});




				$( window ).on( 'resize', _.debounce( function() {
					var wide = $( this ).innerWidth() - 10 ;
					$( '#backbone_grid-container' ).height( '100%' );
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