/**
	For simple applications, you might define all of your views in this file.  
	For more complex applications, you might choose to separate these kind definitions 
	into multiple files under this folder.
*/

enyo.kind({
    name: "flickr.MainView",
    
    classes: "moon enyo-fit",
    
    handlers: {
		onRequestPushPanel: "pushPanel"
	},
	
    components: [
        {kind: "moon.Panels", classes: "enyo-fit", pattern: "alwaysviewing", popOnBack: true, components: [
            {kind: "flickr.SearchPanel"}  // Use our new flickr.SearchPanel
        ]}
    ],
    
    pushPanel: function(inSender, inEvent) {
		this.$.panels.pushPanel(inEvent.panel);
	}
});

// view in which the user searches for photos and browses the results
enyo.kind({

    name: "flickr.SearchPanel", 
    
    kind: "moon.Panel",
    
    title: "Search Flickr",
    
    titleBelow: "Enter search term above",
    
    headerOptions: {inputMode: true, dismissOnEnter: true},
    
    // Add loading spinner
    headerComponents: [
        {kind: "moon.Spinner", content: "Loading...", name: "spinner"}
    ],
        
    events: {
		onRequestPushPanel: ""
	},    
    
    handlers: {
        onInputHeaderChange: "search"
    },
    
    components: [
        {kind: "moon.DataGridList", fit: true, name: "resultList", minWidth: 250, minHeight: 300,  ontap: "itemSelected", components: [
            {
                kind: "moon.GridListImageItem", 
                imageSizing: "cover", 
                useSubCaption: false, 
                centered: false,
                // add bindings from the .model property on GridListImageItem
                bindings: [
                    {from: ".model.title", to:".caption"},
                    {from: ".model.thumbnail", to:".source"}
                ]
            }
        ]}
    ],
    
    // add a binding from that instance variable to the collection property of DataGridList
    bindings: [
        {from: ".photos", to: ".$.resultList.collection"},
        
        // bind the spinner's showing property ($ = moon)
        {from: ".photos.isFetching", to:".$.spinner.showing"}
    ],
    
    // on change, set the input text to the search collection's searchText property
    search: function(inSender, inEvent) {
    
        /*
         * setting searchText kicks off a fetch of the flickr.SearchCollection via the flickr.Store, 
         * using the parameters passed from the collection
         */
        this.$.resultList.collection.set("searchText", inEvent.originator.get("value"));
    },
    
    create: function() {
        this.inherited(arguments);
        
        // set photos collection data
        this.set("photos", new flickr.SearchCollection());
            
        // give our new collection some placeholder data
        /*
        this.set("photos", new enyo.Collection(
            [
                {title: "Photo 1", thumbnail: "http://lorempixel.com/300/300/?1"},
                {title: "Photo 2", thumbnail: "http://lorempixel.com/300/300/?2"},            
                {title: "Photo 3", thumbnail: "http://lorempixel.com/300/300/?3"},           
                {title: "Photo 4", thumbnail: "http://lorempixel.com/300/300/?4"}
            ]
        ));
        */
    },
    
    itemSelected: function(inSender, inEvent) {
		this.doRequestPushPanel({panel: {kind: "flickr.DetailPanel", model: inEvent.model}});
	}
    
});

enyo.kind({
	name: "flickr.DetailPanel",
	kind: "moon.Panel",
	layoutKind: "FittableColumnsLayout",
	components: [
        {kind: "moon.Image", name: "image", fit:true, sizing:"contain"}
	],
	bindings: [
		{from: ".model.title", to: ".title"},
		{from: ".model.original", to: ".$.image.src"}
	]
});
