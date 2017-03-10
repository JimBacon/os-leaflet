/**
 * os-leaflet ; A [Leafletjs](http://leafletjs.com/) TileLayer to display Ordnance Survey
 *       data in your Leaflet map via the OS OpenSpace web map service.
 *
 * https://github.com/rob-murray/os-leaflet
 */
(function (root, factory) {
  // UMD for  Node, AMD or browser globals
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['leaflet', 'proj4leaflet', './OSLicensing'], factory);
  } else if (typeof exports === 'object') {
    // Node & CommonJS-like environments.
    var L = require('leaflet'); // eslint-disable-line vars-on-top
    require('proj4leaflet');
    require('./OSLicensing');
    module.exports = factory(L);
  } else {
    // Browser globals
    if (typeof window.L === 'undefined') {
      throw new Error('Leaflet missing');
    }
    root.returnExports = factory(root.L);
  }
}(this, function (L) {
  /* This is our namespace for OSOpenSpace on Leaflet js */
  L.OSOpenSpace = L.OSOpenSpace || {};
  L.OSOpenSpace.CRS = L.extend(
    new L.Proj.CRS(
      'EPSG:27700',
      '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs', {
        resolutions: [2500, 1000, 500, 200, 100, 50, 25, 10, 5, 2.5]
      }
    ), {
      distance: function (a, b) {
        return L.CRS.Earth.distance(a, b);
      }
    }
  );

  /**
   * A custom Layer for Ordnance Survey OpenSpace service.
   * Note: An API key is needed, see OS website for details
   *
   */
  L.OSOpenSpace.TileLayer = L.TileLayer.WMS.extend({

    initialize: function (apiKey, options, apiUrl) { // (String, Object, String)
      if (!apiKey) {
        throw new Error('OSOpenSpace layer requires an API Key parameter to function.');
      }
      // Default apiUrl set to file:///
      apiUrl = typeof apiUrl !== 'undefined' ? apiUrl : 'file:///';

      //  Default attribution set to comply with OS T&Cs
      var attribution;
      if (typeof options.attribution === 'undefined') {
        attribution = L.OSOpenSpace.attribution();
      }
      else {
        attribution = options.attribution;
        delete options.attribution;
      }

      var layerOptions =  {
        crs: L.OSOpenSpace.CRS,
        maxZoom: 14,
        minZoom: 0,
        tileSize: 200,
      };
      if (attribution !== false) {
        layerOptions.attribution = attribution;
      }

      L.TileLayer.WMS.prototype.initialize.call(this,
        'https://openspace.ordnancesurvey.co.uk/osmapapi/ts', 
        layerOptions,
        options
      );

      this.wmsParams = {
        KEY: apiKey,
        FORMAT: 'image/png',
        URL: apiUrl,
        REQUEST: 'GetMap',
        WIDTH: this.options.tileSize,
        HEIGHT: this.options.tileSize
      };

    },

  /**
   * Return a url for this tile.
   * Calculate the bbox for the tilePoint and format the wms request
   */
    getTileUrl: function (tilePoint) { // (Point, Number) -> String
      var resolutionMpp = this.options.crs.options.resolutions[tilePoint.z],
        tileSizeMetres = this.options.tileSize * resolutionMpp,
        tileBboxX0 = tileSizeMetres * tilePoint.x,
        tileBboxY0 = tileSizeMetres * (-1 - tilePoint.y); // TODO: Is there a missing transformation ? tilePoint appears to be topLeft in this config

      // service is a tile based wms format and only requires x0, y0 - ignore other points
      this.wmsParams.BBOX = [tileBboxX0, tileBboxY0, 0, 0].join(',');
      this.wmsParams.LAYERS = resolutionMpp;

      return this._url + L.Util.getParamString(this.wmsParams); // eslint-disable-line no-underscore-dangle
    },

    onAdd: function (map) {
      // Call parent function.
      L.TileLayer.WMS.prototype.onAdd.call(this, map);

      // Trigger an event when adding of layer has finished.
      map.on('layeradd', function(e) {
        // Check it is the OS OpenSpace layer (note 'this' has been bound).
        if (e.layer == this) {
          // Add a click handler to a Terms of Use link.
          L.OSOpenSpace._termsClickHandler(map);
       }
      }.bind(this));

    },
  });

  /*
   * Factory method to create a new OSOpenSpace tilelayer.
   *
   * @public
   * @param {string} apiKey Your API key for OSOpenSpace.
   * @param {object} options Any options to pass to the tilelayer.
   * @param {string} apiUrl The URL of your site as provided to OSOpenSpace.
   * @return {L.TileLayer} TileLayer for Ordnance Survey OpenSpace service.
   */
  L.OSOpenSpace.tilelayer = function (apiKey, options, apiUrl) {
    return new L.OSOpenSpace.TileLayer(apiKey, options, apiUrl);
  };

  return L.OSOpenSpace;
}));
