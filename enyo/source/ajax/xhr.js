//* @protected
/**
	If you make changes to _enyo.xhr_, be sure to add or update the appropriate
	[unit tests](https://github.com/enyojs/enyo/tree/master/tools/test/ajax/tests).
*/
enyo.xhr = {
	/**
		<code>inParams</code> is an Object that may contain these properties:

		- _url_: The URL to request (required).
		- _method_: The HTTP method to use for the request. Defaults to GET.
		- _callback_: Called when request is completed. (Optional)
		- _body_: Specific contents for the request body for POST method. (Optional)
		- _headers_: Additional request headers. (Optional).  Given headers override the ones that Enyo may set by default (`null` explictly removing the header from the AJAX request).
		- _username_: The optional user name to use for authentication purposes.
		- _password_: The optional password to use for authentication purposes.
		- _xhrFields_: Optional object containing name/value pairs to mix directly into the generated xhr object.
		- _mimeType_: Optional string to override the MIME-Type.
		- _mozSystem_: Optional boolean to create cross-domain XHR (Firefox OS only)
		- _mozAnon_: Optional boolean to create anonymous XHR that does not send cookies or authentication headers (Firefox OS only)

		Note: on iOS 6, we will explicity add a "cache-control: no-cache"
		header for any non-GET requests to workaround a system bug that caused
		non-cachable requests to be cached. To disable this, use the _header_
		property to specify an object where "cache-control" is set to null.
	*/
	request: function(inParams) {
		var xhr = this.getXMLHttpRequest(inParams);
		var url = this.simplifyFileURL(enyo.path.rewrite(inParams.url));
		//
		var method = inParams.method || "GET";
		var async = !inParams.sync;
		//
		if (inParams.username) {
			xhr.open(method, url, async, inParams.username, inParams.password);
		} else {
			xhr.open(method, url, async);
		}
		//
		enyo.mixin(xhr, inParams.xhrFields);
		// only setup handler when we have a callback
		if (inParams.callback) {
			this.makeReadyStateHandler(xhr, inParams.callback);
		}
		//
		inParams.headers = inParams.headers || {};
		// work around iOS 6.0 bug where non-GET requests are cached
		// see http://www.einternals.com/blog/web-development/ios6-0-caching-ajax-post-requests
		if (method !== "GET" && enyo.platform.ios && enyo.platform.ios == 6) {
			if (inParams.headers["cache-control"] !== null) {
				inParams.headers["cache-control"] = inParams.headers['cache-control'] || "no-cache";
			}
		}
		// user-set headers override any platform-default
		if (xhr.setRequestHeader) {
			for (var key in inParams.headers) {
				if (inParams.headers[key]) {
					xhr.setRequestHeader(key, inParams.headers[key]);
				}
			}
		}
		//
		if((typeof xhr.overrideMimeType == "function") && inParams.mimeType) {
			xhr.overrideMimeType(inParams.mimeType);
		}
		//
		xhr.send(inParams.body || null);
		if (!async && inParams.callback) {
			xhr.onreadystatechange(xhr);
		}
		return xhr;
	},
	//* remove any callbacks that might be set from Enyo code for an existing XHR
	//* and stop the XHR from completing.
	cancel: function(inXhr) {
		if (inXhr.onload) {
			inXhr.onload = null;
		}
		if (inXhr.onreadystatechange) {
			inXhr.onreadystatechange = null;
		}
		if (inXhr.abort) {
			inXhr.abort();
		}
	},
	//* @protected
	makeReadyStateHandler: function(inXhr, inCallback) {
		if (window.XDomainRequest && inXhr instanceof window.XDomainRequest) {
			inXhr.onload = function() {
				var data;
				if (inXhr.responseType === "arraybuffer") {
					data = inXhr.response;
				} else if (typeof inXhr.responseText === "string") {
					data = inXhr.responseText;
				}
				inCallback.apply(null, [data, inXhr]);
				inXhr = null;
			};
		} else {
			inXhr.onreadystatechange = function() {
				if (inXhr && inXhr.readyState == 4) {
					var data;
					if (inXhr.responseType === "arraybuffer") {
						data = inXhr.response;
					} else if (typeof inXhr.responseText === "string") {
						data = inXhr.responseText;
					}
					inCallback.apply(null, [data, inXhr]);
					inXhr = null;
				}
			};
		}
	},
	inOrigin: function(inUrl) {
		var a = document.createElement("a"), result = false;
		a.href = inUrl;
		// protocol is ":" for relative URLs
		if (a.protocol === ":" ||
				(a.protocol === window.location.protocol &&
					a.hostname === window.location.hostname &&
					a.port === (window.location.port ||
						(window.location.protocol === "https:" ? "443" : "80")))) {
			result = true;
		}
		return result;
	},
	simplifyFileURL: function(inUrl) {
		var a = document.createElement("a");
		a.href = inUrl;
		// protocol is ":" for relative URLs
		if (a.protocol === "file:" ||
			a.protocol === ":" && window.location.protocol === "file:") {
			// leave off search and hash parts of the URL
			// and work around a bug in webOS 3 where the app's host has a domain string
			// in it that isn't resolved as a path
			var host = (enyo.platform.webos < 4) ? "" : a.host;
			return a.protocol + '//' + host + a.pathname;
		} else if (a.protocol === ":" && window.location.protocol === "x-wmapp0:") {
			// explicitly return absolute URL for Windows Phone 8, as an absolute path is required for local files
			return window.location.protocol + "//" + window.location.pathname.split('/')[0] + "/" + a.host + a.pathname;
		} else {
			return inUrl;
		}
	},
	getXMLHttpRequest: function(inParams) {
		try {
			// only use XDomainRequest when it exists, no extra headers were set, and the
			// target URL maps to a domain other than the document origin.
			if (enyo.platform.ie < 10 && window.XDomainRequest && !inParams.headers &&
				!this.inOrigin(inParams.url) && !/^file:\/\//.test(window.location.href)) {
				return new window.XDomainRequest();
			}
		} catch(e) {}
		try {

			if (enyo.platform.firefoxOS) {
				var shouldCreateNonStandardXHR = false; // flag to decide if we're creating the xhr or not
				var xhrOptions = {};

				// mozSystem allows you to do cross-origin requests on Firefox OS
				// As seen in:
				//   https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Non-standard_properties
				if (inParams.mozSystem) {
					xhrOptions.mozSystem = true;
					shouldCreateNonStandardXHR = true;
				}

				// mozAnon allows you to send a request without cookies or authentication headers
				// As seen in:
				//   https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Non-standard_properties
				if (inParams.mozAnon) {
					xhrOptions.mozAnon = true;
					shouldCreateNonStandardXHR = true;
				}

				if (shouldCreateNonStandardXHR) {
					return new XMLHttpRequest(xhrOptions);
				}
			}

			return new XMLHttpRequest();
		} catch(e) {}
		return null;
	}
};
