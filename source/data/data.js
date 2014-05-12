/**
	For simple applications, you might define all of your models, collections,
	and sources in this file.  For more complex applications, you might choose to separate
	these kind definitions into multiple files under this folder.
*/

enyo.kind({
    name: "flickr.Source",
    kind: "enyo.JsonpSource",
    urlRoot: "http://api.flickr.com/services/rest/",
    
    // override fetch, add properties that all Flickr requests will need
    fetch: function(rec, opts) {
    
        opts.callbackName = "jsoncallback";
        
        /*
         * search parameters need to be added
         * rec is a reference to the model/collection being fetched
         */
        opts.params = enyo.clone(rec.params);
        
        opts.params.api_key = "2a21b46e58d207e4888e1ece0cb149a5";
        opts.params.format = "json";
        
        /*
         * Superkinds of your controls will also have their create() functions called
         * always call the superkind's implementation
         */
        this.inherited(arguments);
    }
});


/*
 * create a subkind of enyo.Collection that uses flickr.Source 
 * to fetch a collection of image records based on search 
 */
enyo.kind({
    name: "flickr.SearchCollection",
    kind: "enyo.Collection",
    // ".Source" is dropped from flickr.Source when used as the value of defaultSource
    defaultSource: "flickr",
    
    // destroy any previously fetched records and then fetch more
    published: {
        searchText: null,
    },
    searchTextChanged: function() {
        this.destroyAll();
        this.fetch();
    },
    
    /*
     * Flickr photos search API requires us to pass a method query string parameter
     * indicating that we want to search photos
     */
    fetch: function(opts) {
        this.params = {
            method: "flickr.photos.search",
            sort: "interestingness-desc",
            per_page: 50,
            text: this.searchText
        };
        return this.inherited(arguments);
    },
    
    // return the array to load into the collection
    parse: function(data) {
    
        /*    {
         *        "photos": {
         *            "photo": [
         *                {
         *                    "id": "8866167062",
         *                    "owner": "23101599@N03",
         *                    "secret": "2a48819a28",
         *                    "server": "3748",
         *                    "farm": 4,
         *                    "title": "My Wife and The Union Jack",
         *                    "ispublic": 1,
         *                    "isfriend": 0,
         *                    "isfamily": 0
         *                }
         *            ]
         *        }
         *    }
         */
        return data && data.photos && data.photos.photo;
    },
    
    // tell flickr.SearchCollection to wrap all records fetched, using flickr.ImageModel
    model: "flickr.ImageModel"
});


// Flickr API build URL http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
enyo.kind({
    name: "flickr.ImageModel",
    kind: "enyo.Model",
    readOnly: true,
    attributes: {
        thumbnail: function() {
            return "http://farm" + this.get("farm") +
                ".static.flickr.com/" + this.get("server") +
                "/" + this.get("id") + "_" + this.get("secret") + "_m.jpg";
        },
        original: function() {
            return "http://farm" + this.get("farm") +
                ".static.flickr.com/" + this.get("server") +
                "/" + this.get("id") + "_" + this.get("secret") + ".jpg";
        }
    },
    computed: {
        thumbnail: ["farm", "server", "id", "secret"],
        original: ["farm", "server", "id", "secret"]
    }
});

// register our newly-created source, to make it available for use by models and collections
enyo.store.addSources({flickr: "flickr.Source"});