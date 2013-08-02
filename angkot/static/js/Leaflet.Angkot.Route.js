L.Angkot.Route = L.LayerGroup.extend({
  options: {
    editable: false,
  },

  initialize: function(layers, options) {
    L.LayerGroup.prototype.initialize.call(this, layers);
    L.Util.setOptions(this, options);

    this._polylines = [];
    this._active = null;
    this._guide = new L.Polyline.Color([], {
      color: 'blue',
      weight: 2,
      opacity: 0.5,
    });
    this._ctrlKey = false;

    this._tooltip = new L.Tooltip();
  },

  onAdd: function(map) {
    L.LayerGroup.prototype.onAdd.apply(this, arguments);

    if (this.options.editable) {
      this._setupEvents();
      this._guide.addTo(map);
    }

    this._tooltip.addTo(map);
    this._tooltip.setContent('hore', 'blah');
  },

  onRemove: function(map) {
    map.removeLayer(this._tooltip);
    L.LayerGroup.prototype.onRemove.apply(this, arguments);
  },

  setEditable: function(editable) {
    this.options.editable = editable;
    if (editable) this._setupEvents();
    else this._removeEvents();

    // FIXME restructure
    if (this._map) {
      if (editable) this._guide.addTo(this._map);
      else this._map.removeLayer(this._guide);
    }
  },

  _setupEvents: function() {
    if (!this._map) return;

    this._map.on('click', this._onMapClick, this);
    this._map.on('mousemove', this._onMapMouseMove, this);
    this._map.on('mouseover', this._onMapMouseOver, this);

    L.DomEvent.addListener(document, 'keydown', function(e) {
      this._ctrlKey = e.ctrlKey;
    }, this);
    L.DomEvent.addListener(document, 'keyup', function(e) {
      this._ctrlKey = e.ctrlKey;
    }, this);
  },

  _removeEvents: function() {
    if (!this._map) return;

    this._map.off('click', this._onMapClick, this);
    this._map.off('mousemove', this._onMapMouseMove, this);
    this._map.off('mouseover', this._onMapMouseOver, this);
  },

  _onMapClick: function(e) {
    if (this._active) {
      this._addNextPoint(e);
    }
    else {
      this._startRoute(e);
    }
  },

  _startRoute: function(e) {
    var p = this._addPolyline();
    p.addLatLng(e.latlng);
    this._active = p;

    this._guide.spliceLatLngs(0, this._guide._latlngs.length);
    this._guide.addLatLng(e.latlng);
    this._guide.addLatLng(e.latlng);

    if (this._polylines.length == 1) {
      this._tooltip.setContent('Lanjutkan dengan mengklik titik-titik di sepanjang rute');
    }
  },

  _addNextPoint: function(e) {
    this._active.addLatLng(e.latlng);
    this._guide.spliceLatLngs(0, 1, e.latlng);

    if (this._polylines.length == 1) {
      var len = this._polylines[0]._latlngs.length;
      if (len == 2) {
        this._tooltip.setContent('Klik titik terakhir untuk mengakhiri');
      }
      else if (len == 3) {
        this._tooltip.setContent(null);
      }
    }
  },

  _onMapMouseOver: function(e) {
    if (this._polylines.length == 0) {
      this._tooltip.setContent('Klik untuk membuat rute');
    }
  },

  _onMapMouseMove: function(e) {
    if (this._active) {
      this._guide.spliceLatLngs(1, 1, e.latlng);
    }

    this._tooltip.setLatLng(e.latlng);
  },

  _createPolyline: function() {
    var p = new L.Polyline.Editable([], {
      editable: true,
      color: 'blue',
      weight: 3,
      opacity: 0.8,
    });
    return p;
  },

  _addPolyline: function() {
    var p = this._createPolyline();
    p.addTo(this._map);
    p.on('handle:click', this._onHandleClick, this);
    p.on('handle:mouseover', this._onHandleMouseOver, this);
    p.on('handle:mouseout', this._onHandleMouseOut, this);
    this._polylines.push(p);
    return p;
  },

  _removePolyline: function(p) {
    var index = this._polylines.indexOf(p);
    if (index >= 0) this._polylines.splice(index, 1);

    p.off('handle:mouseover', this._onHandleMouseOver, this);
    p.off('handle:mouseout', this._onHandleMouseOut, this);
    p.off('handle:click', this._onHandleClick, this);
    if (this._map) this._map.removeLayer(p);
  },

  _stopDrawing: function() {
    this._active.setColor('red');
    this._active = null;
    this._guide.spliceLatLngs(0, this._guide._latlngs.length);
  },

  _continueRoute: function(e) {
    var p = e.target;
    if (e.vertex === 0) {
      p.reverseLatLngs();
    }
    this._active = p;
    this._active.setColor('blue');
    this._guide.addLatLng(e.latlng);
    this._guide.addLatLng(e.latlng);
  },

  _mergeRoute: function(e) {
    var p = e.target;
    if (e.vertex !== 0) {
      p.reverseLatLngs();
    }
    this._active.addLatLngs(p._latlngs);
    this._removePolyline(p);
  },

  _removeVertex: function(e) {
    var p = e.target;
    p.spliceLatLngs(e.vertex, 1);
    if (p._latlngs.length === 1) {
      this._removePolyline(p);
    }
  },

  _onHandleMouseOver: function(e) {
    var p = e.target;
    var length = p._latlngs.length;
    var head = e.vertex === 0;
    var tail = e.vertex === length - 1;
    var tip = head || tail;
    var onVertex = e.vertex !== undefined;

    if (!this._active) {
      if (tip) {
        this._tooltip.setContent('Klik untuk melanjutkan rute');
      }
      else if (onVertex) {
        this._tooltip.setContent('Untuk menghapus titik, tahan tombol <kbd>ctrl</kbd> lalu klik titik yang mau dihapus');
      }
    }
    else if (p !== this._active) {
      if (tip) {
        this._tooltip.setContent('Untuk menggabung rute, tahan tombol <kbd>ctrl</kbd> lalu klik titik tujuan');
      }
    }
  },

  _onHandleMouseOut: function(e) {
    if (!this._active || this._polylines.length > 1) {
      this._tooltip.setContent(null);
    }
  },

  _onHandleClick: function(e) {
    var p = e.target;
    var length = p._latlngs.length;
    var head = e.vertex === 0;
    var tail = e.vertex === length - 1;
    var tip = head || tail;

    if (e.target == this._active) {
      if (tail) {
        if (length === 1) {
          this._removePolyline(p);
        }
        this._stopDrawing();
      }
      else {
        this._addNextPoint(e);
      }
    }
    else if (!this._active && this._ctrlKey && e.vertex !== undefined) {
      this._removeVertex(e);
    }
    else if (tip) {
      if (!this._active) {
        this._continueRoute(e);
      }
      else if (this._active && this._ctrlKey) {
        this._mergeRoute(e);
        this._stopDrawing();
      }
      else if (this._active) {
        this._addNextPoint(e);
      }
    }
    else if (!this._active) {
      this._startRoute(e);
    }
    else {
      this._addNextPoint(e);
    }
  },
});

