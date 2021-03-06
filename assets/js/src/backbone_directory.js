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
				this.listenTo( this.backboneGrid, 'detailView', this.personDetail );
				this.listenTo( this.backboneGrid, 'syncModel', this.syncModel );
				this.listenTo( this.backboneGrid, 'closeModal', this.hidePersonDetailDialog );
				this.$el.hide();
			},

			// Show detail for the person who was just triggered
			personDetail: function( personModel ) {
				console.log( 'personDetail' );
				this.model = personModel;
				this.updateURL();
				this.render();
				this.showPersonDetailDialog();
			},

			// Set the model to match
			syncModel: function( personModel ) {
				console.log( 'syncModel' );
				if ( this.$el.is(':hidden') ) {
					return;
				}
				this.model = personModel;
				this.updateURL();
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

			updateURL: function() {
				if ( ! _.isUndefined( this.model.get( 'title' ) ) ) {
					this.backboneRouter.navigate( '?details=' + this.model.get( 'title' ), { replace: false, trigger: false } );
				}
			},

			render: function() {
				var self = this;


				console.log( 'BackbonePersonDetail render ' );
				this.$el.html( this.template( this.model.attributes ) );

				// Are we missing any attributes?
				if ( _.isUndefined( this.model.get( 'aboutMe' ) ) ){
					$.ajax( {
						//url = '//gravatar.com/'
					});
				}

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
				var self = this;
				this.backboneRouter = options.backboneRouter;
				console.log( 'backbone_Searchbar.initialize ' );
				this.backbonePeople = options.backbonePeople;
				this.render();
				this.$el.on( 'keyup', '#backbone_person-search-field',_.debounce( function(){
					self.searchChange( this );
				}, 250 ) );
			},

			events: {
				'keypress #backbone_person-search-field':  'searchChange',
				'focus #backbone_person-search-field':     'searchFocus'
			},

			searchChange: function( search ) {
				var searchFor = this.$el.find( search ).prop('value');
				console.log( 'searchchange ' + searchFor );
				this.backbonePeople.searchFor( searchFor );
			},

			searchFocus: function() {
				$( window ).trigger( 'scroll', true );
			},

			render: function() {
				var self = this;
				console.log( 'backbone_Searchbar:render ' );
				var templatehtml = this.template( this.search );
				this.$el.html( templatehtml );
				if ( 0 !== $( document ).find( '#wpadminbar' ).length ){
					this.$el.css( 'margin-top', '38px' );
				}
				return this;

				return this;
			}
		}),
		/**
		 * The Grid view - displays the directory grid
		 */
		BackboneGrid = Backbone.View.extend({
			backbonePeople: null, /* the collection of backbonePeople */
			el:             '#backbone_grid',
			msnry:          null,
			template:       wp.template( 'backbone_person' ),
			modelsPerRow:   3,

			events: {
				'click .backbone_person-card': 'clickackbonePerson'
			},

			clickackbonePerson: function( person ) {
				console.log( 'triggering personDetail' );
				var $person    = $( person.currentTarget ),
					name       = $person.find('.backbone_person-name>span').text();

				this.model = this.backbonePeople.findWhere( { 'title': name } );
				this.trigger( 'detailView', this.model );
			},

			initialize: function( options ) {
				var self = this;
				console.log( 'BackboneGrid.initialize' );
				this.backbonePeople = options.backbonePeople;
				this.backboneRouter = options.backboneRouter;
				this.listenTo( this.backbonePeople, 'change', this.searchChanged );
				$( document ).on( 'keyup', _.throttle( function( e ){
					self.keyPress( e );
				}, 125 ) );
				this.listenTo( this, 'syncBGModel', this.syncModel );

			},

			syncModel: function( model ) {
				this.model = model;
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

			goPreviousRow: function() {
				if ( ! this.hasPreviousRow() ) {
					return;
				}
				this.model = this.backbonePeople.at( this.backbonePeople.indexOf( this.model ) - this.modelsPerRow );
				this.render();
			},

			hasPreviousRow: function() {
				return ( this.getCurrentIndex() - this.modelsPerRow ) > -1;
			},

			goNextRow: function() {
				if ( ! this.hasNextRow() ) {
					return;
				}
				this.model = this.backbonePeople.at( this.getCurrentIndex() + this.modelsPerRow );
				this.render();
			},

			hasNextRow: function() {
				return ( this.getCurrentIndex() + this.modelsPerRow ) < this.backbonePeople.length;
			},

			keyPress: function( event ){
				console.log( 'keypress - ' + event.keyCode );

				// Pressing the escape key closes the dialog
				if ( event.keyCode === 27 ) {
					this.trigger( 'closeModal' );
					return event;
				}

				if ( 13 === event.keyCode || 32 === event.keyCode ) { /* enter or space */
					$( event.target ).trigger( 'click' );
				}

				if ( this.$el.is(':hidden') ) {
					return;
				}

				if ( 39 === event.keyCode || 9 === event.keyCode && ( ! event.shiftKey ) ) { /* right or tab */
					console.log( 'gonext' );
					_.once( this.goNext() );
				}

				if ( 37 === event.keyCode || ( 9 === event.keyCode && event.shiftKey )) { /* left or shift-tab */
					_.once( this.goPrevious() );
				}

				if ( 38 === event.keyCode ) { /* up */
					_.once( this.goPreviousRow() );
				}

				if ( 40 === event.keyCode ) { /* down */
					_.once( this.goNextRow() );
				}
			},

			focusSelected: function() {
				var focusElement = '#backbone_person-' + this.model.get( 'ID' );
				console.log( focusElement );
				$( focusElement ).focus();
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
						return ( -1 !== theModel.get( 'title' ).toLowerCase().indexOf( search ) );
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

				if ( _.isUndefined( self.model.get( 'ID' ) ) ) {
					self.model = self.backbonePeople.first();
				}
				this.focusSelected();
				this.trigger( 'syncModel', this.model );

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
				var model = BackboneDirectoryApp.backbonePeople.where( { 'title': name } )[0];
				BackboneDirectoryApp.backboneGrid.trigger( 'syncBGModel', model );
				BackboneDirectoryApp.backboneGrid.trigger( 'detailView', model );

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

			pagelimit:   80,
			loadedCount: 0,

			fetch: function( offset ) {
				this.backbonePeople.url = '/wp-json/posts?filter[posts_per_page]=' +
					this.pagelimit +
					' &filter[order]=ASC&filter[offset]=' +
					offset +
					'&type=backbonedirectory';

				return this.backbonePeople.fetch( { remove: false } );
			},

			watchForScroll: function( retrigger ) {
				var self = this;
				$( window ).on( 'scroll', function( args, retrigger ) {

					if( true === retrigger || $(window).scrollTop() + screen.height > $('body').height()) {
							$( window ).off( 'scroll' );
							console.log( 'scroll' );
							var fetched = self.fetch( self.loadedCount );
							fetched.done( function( results ) {
								if ( ! _.isEmpty( results ) ) {
									self.loadedCount += self.pagelimit;
									self.backboneGrid.render();
									self.watchForScroll( retrigger );
									console.log( $(document).height() );
									$("body").scrollTop( $('#backbone_grid-container').height() - 1500 );
								}
						});
					}
				});
				if ( retrigger ) {
					$( window ).trigger( 'scroll', true );
				}
			},

			recalcModelsPerRow: function() {
				var wide = $( '#backbone_grid' ).innerWidth() - 10,
					cardwidth = $( '.backbone_person-card:first' ).innerWidth();
				this.backboneGrid.modelsPerRow = Math.floor( wide/cardwidth );
				console.log( 'recalcModelsPerRow - ' + Math.floor( wide/cardwidth ) );
			},

			initialize: function() {
				var self = this, users, imgsrc, gravhash, fetched, fetched2,
					$loadcount = $( '#backbone_directory_loading_count' );

				self.backbonePeople = new BackbonePersonCollection( );

				fetched = this.fetch( self.loadedCount );
				fetched.done( function( results ) {
					self.loadedCount += self.pagelimit;
					self.backbonePersonDisp = new BackbonePersonDisplay( {
						model: new BackbonePerson()
					});
					self.backboneRouter = new BackboneRouter();
					var options = {
							'backbonePeople': self.backbonePeople,
							'backboneRouter': self.backboneRouter,
							model: new BackbonePerson()
							};
					self.backboneGrid = new BackboneGrid( options );

					var	searchBar  = new BackboneSearchbar( options );
						self.personDetail = new BackbonePersonDetail( _.extend(
							options, {
								'backboneGrid': self.backboneGrid,
								model: new BackbonePerson()
							} ) );

					self.backboneGrid.render();
					self.recalcModelsPerRow();
					self.watchForScroll();
					$( self ).trigger( 'finishLoad' );
				});



				$( window ).on( 'resize', _.debounce( function() {
					var wide = $( this ).innerWidth() - 10 ;
					$( '#backbone_grid-container' ).height( '100%' );
					$( '#backbone_grid-container' ).width( wide + 'px' );

					self.recalcModelsPerRow();
				}, 150 ) );

				$( self ).on( 'finishLoad', function(){
					console.log( 'finishLoad' );
					self.personDetail.backboneRouter = self.backboneRouter;
					Backbone.history.start( {
						pushState: true,
						root:      window.location.pathname,
						silent:    false
					});
					self.backboneGrid.focusSelected();
				});

			}
		};

		BackboneDirectoryApp.initialize();
	});
})(jQuery);