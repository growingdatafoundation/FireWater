var apikey = 'HiQJYJvRF0bzY3C1FDReYh8VXa8a2LFRnUUthlwGUG4';
var zoomLevel = 10;
var panel = document.getElementById('panel');
//var dataUrl = 'https://geo.opensensing.at/cgi-bin/qgis_mapserv.fcgi?SERVICE=WFS&VERSION=2.0&REQUEST=getFeature&typeName=firewater&MAP=/home/phartl/geo/firehack.qgs&outputFormat=application/json';
var dataUrl = 'https://firewater.opensensing.com/api/firewaters';
var routes = [];
var platform = new H.service.Platform({
  apikey: apikey
});
var count = 0;
var idx = 0;
var defaultLayers = platform.createDefaultLayers();

//Step 2: initialize a map - this map is centered over Europe
var map = new H.Map(document.getElementById('map'),
  defaultLayers.vector.normal.map,{
  center: {lat:50, lng:5},
  zoom: 9,
  pixelRatio: window.devicePixelRatio || 1
});
// add a resize listener to make sure that the map occupies the whole container
window.addEventListener('resize', () => map.getViewPort().resize());

//Step 3: make the map interactive
// MapEvents enables the event system
// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Create the default UI components
var ui = H.ui.UI.createDefault(map, defaultLayers);


map.setCenter({lat:-34.92874438537443, lng:138.5987412929535});
map.setZoom(zoomLevel);
var layers = [];
var base = 'Hydrants.zip';
function addMarkerToGroup(group, coordinate, html) {
  var marker = new H.map.Marker(coordinate);
  // add custom data to the marker
  marker.setData(html);
  group.addObject(marker);
}


getData(function(response){
 for(var i in response) {
    
      //add a marker
      var marker = new H.map.Marker({lat:response[i].lat, lng:response[i].lng});
      map.addObject(marker);
     
  //    marker.addEventListener('tap', function (evt) {
      var xy = map.geoToScreen({lat:response[i].lat, lng:response[i].lng});

      var bubble =  new H.ui.InfoBubble(map.screenToGeo(xy.x, xy.y - 30), {
        content: response[i].device_name
      });

      ui.addBubble(bubble);
    //}, false);
  }
 
 /*
  group = new H.map.Group();
group.addObject(marker1);
group.addObject(marker2);

// add to map
map.addObject(group);
shp(base).then(function(geojsonObject){
  console.log(geojsonObject[0].features)
  var icon = new H.map.Icon('hydrant-icon.png')
  for(var i in geojsonObject[0].features) {
      //add a marker
      var marker = new H.map.Marker({lat:geojsonObject[0].features[i].geometry.coordinates[1], lng:geojsonObject[0].features[i].geometry.coordinates[0]}, {icon: icon});
      group.addObject(marker);
  }

}); */
  $('body').addClass('loaded');
});


//------------- Function list --------------
function getData(callback) {
  $.ajax({
    url: dataUrl,
    type: "GET",
    success : function (response) {
    //  callback([{"id":2,"device_id":4,"lat":"-33.352474","lng":"138.18175","device_name":"pls2-l-0066","toas":null,"cap":null,"lev":"15826","con":null,"geom":"0101000020E6100000894160E5D04561405C5837DE1DAD40C0","time_updated":"2020-08-15 08:48:37.296055"},{"id":1,"device_id":3,"lat":"-35.025856","lng":"138.52568","device_name":"pls2-l-0067","toas":null,"cap":null,"lev":"11619","con":null,"geom":"0101000020E61000002905DD5ED2506140E333D93F4F8341C0","time_updated":"2020-08-15 10:45:58.587888"}]);
     callback(response)
    }
  });
}

function getCurrentLocation(){ 
  if (!navigator.geolocation){
    alert("<p>Sorry, your browser does not support Geolocation</p>");
    return;
  }
  navigator.geolocation.getCurrentPosition(success, error);
}

function success(position) {
 // $('body').removeClass('loaded');
  var currentPos = {lat: position.coords.latitude,lng: position.coords.longitude};
  var curr = new H.map.Marker(currentPos);
  map.addObject(curr);

  map.setZoom(zoomLevel-2);
  map.setCenter(currentPos);
  count = 0;
  getData(function(response){
    for(var i in response) {
      count++;
     
      var to = {lat:response[i].lat, lng:response[i].lng};
      calculateRouteFromAtoB(currentPos, to, addRoute2Array);  
    }
    //wait for all routes to finish first
  });
}
function error() {
  alert("Unable to retrieve your location");
};
// Routing
function calculateRouteFromAtoB (from, to, callback) {

  var router = platform.getRoutingService(null, 8),
  routeRequestParams = {
    routingMode: 'fast',
    transportMode: 'car',
    origin: from.lat+','+from.lng,
    destination: to.lat+','+to.lng,
    return: 'polyline,turnByTurnActions,actions,instructions,travelSummary'
  };
  router.calculateRoute(
    routeRequestParams,
    callback,
    onError
  );
}
function addRoute2Array(result) {
 routes.push(result.routes[0]);
  idx++;
  if (count == idx) {
    let bestDistance = -1;
    let bestRouteIndex = 0;
    let duration = 0, distance = 0;
    for (var j in routes) {
      duration = 0;
      distance = 0;
      routes[j].sections.forEach((section) => {
        distance += section.travelSummary.length;
        duration += section.travelSummary.duration;
      });
      if (bestDistance == -1) {
        bestDistance = distance;
        bestRouteIndex = j;
      } else if (bestDistance > distance) {
        bestDistance = distance;
        bestRouteIndex = j;
      }
    }
    addRouteShapeToMap(routes[bestRouteIndex]);
    addManueversToMap(routes[bestRouteIndex]);
    addSummaryToPanel(routes[bestRouteIndex]);
   // addWaypointsToPanel(routes[bestRouteIndex]);
    //addManueversToPanel(routes[bestRouteIndex]);
  
    //Within the onResult callback:

// Create an outline for the route polyline:

// create a group that represents the route line and contains

    $('body').addClass('loaded');
    //calculateRouteFromAtoB(currentPos, to, );
  }
}
function onError(error) {
  alert('Can\'t reach the remote server');
}
function addRouteShapeToMap(route){
  route.sections.forEach((section) => {
    // decode LineString from the flexible polyline
    let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);

    // Create a polyline to display the route:
    let polyline = new H.map.Polyline(linestring, {
      style: {
        lineWidth: 4,
        strokeColor: 'rgba(0, 128, 255, 0.7)'
      }
    });

    // Add the polyline to the map
    map.addObject(polyline);
    // And zoom to its bounding rectangle
    map.getViewModel().setLookAtData({
      bounds: polyline.getBoundingBox()
    });
  });
}


/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addManueversToMap(route){
  var svgMarkup = '<svg width="18" height="18" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="8" cy="8" r="8" ' +
      'fill="#1b468d" stroke="white" stroke-width="1"  />' +
    '</svg>',
    dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}}),
    group = new  H.map.Group(),
    i,
    j;
  route.sections.forEach((section) => {
    let poly = H.geo.LineString.fromFlexiblePolyline(section.polyline).getLatLngAltArray();

    let actions = section.actions;
    // Add a marker for each maneuver
    for (i = 0;  i < actions.length; i += 1) {
      let action = actions[i];
      var marker =  new H.map.Marker({
        lat: poly[action.offset * 3],
        lng: poly[action.offset * 3 + 1]},
        {icon: dotIcon});
      marker.instruction = action.instruction;
      group.addObject(marker);
    }

    group.addEventListener('tap', function (evt) {
      map.setCenter(evt.target.getGeometry());
      openBubble(
         evt.target.getGeometry(), evt.target.instruction);
    }, false);

    // Add the maneuvers group to the map
    map.addObject(group);
  });
}
var bubble;
function openBubble(position, text){
  if(!bubble){
     bubble =  new H.ui.InfoBubble(
       position,
       // The FO property holds the province name.
       {content: text});
     ui.addBubble(bubble);
   } else {
     bubble.setPosition(position);
     bubble.setContent(text);
     bubble.open();
   }
 }
Number.prototype.toMMSS = function () {
  return  Math.floor(this / 60)  +' minutes '+ (this % 60)  + ' seconds.';
}
Number.prototype.toKM = function () {
  return  Math.floor(this / 1000);
}
function addSummaryToPanel(route){
  let duration = 0,
      distance = 0;

  route.sections.forEach((section) => {
    distance += section.travelSummary.length;
    duration += section.travelSummary.duration;
  });

  var summaryDiv = document.createElement('div'),
   content = '';
   content += '<b>Total distance</b>: ' + distance.toKM()  + 'km. <br/>';
   content += '<b>Travel Time</b>: ' + duration.toMMSS() + ' (in current traffic)';


  summaryDiv.style.fontSize = 'small';
  summaryDiv.style.marginLeft ='5%';
  summaryDiv.style.marginRight ='5%';
  summaryDiv.innerHTML = content;
  panel.appendChild(summaryDiv);
}
/*
*/