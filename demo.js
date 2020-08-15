var apikey = 'M3F1H0aDtDmkjvHj2NdMVK4HnEYi0V0Z16CvUiwuHzk';
var zoomLevel = 14;
var routeInstructionsContainer = document.getElementById('panel');
var wfsUrl = 'https://geo.opensensing.at/cgi-bin/qgis_mapserv.fcgi?SERVICE=WFS&VERSION=2.0&REQUEST=getFeature&typeName=firewater&MAP=/home/phartl/geo/firehack.qgs&outputFormat=application/json'
var platform = new H.service.Platform({
  apikey: apikey
});
var defaultLayers = platform.createDefaultLayers();

//Step 2: initialize a map - this map is centered over Europe
var map = new H.Map(document.getElementById('map'),
  defaultLayers.vector.normal.map,{
  center: {lat:50, lng:5},
  zoom: 4,
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

//add a marker
var adelaide = new H.map.Marker({lat:-34.92874438537443, lng:138.5987412929535});
map.addObject(adelaide);

map.setCenter({lat:-34.92874438537443, lng:138.5987412929535});
map.setZoom(zoomLevel);


//------------- Function list --------------
function getCurrentLocation(){ 
  if (!navigator.geolocation){
    alert("<p>Sorry, your browser does not support Geolocation</p>");
    return;
  }
  navigator.geolocation.getCurrentPosition(success, error);
}

function success(position) {
  console.log("Does it come inside")
  var currentPos = {lat: position.coords.latitude,lng: position.coords.longitude};
  var to = {lat:-34.92874438537443, lng:138.5987412929535};
  var curr = new H.map.Marker(currentPos);
  map.addObject(curr);

  map.setCenter(currentPos);
  map.setZoom(zoomLevel);
  calculateRouteFromAtoB(currentPos, to);
}
function error() {
  alert("Unable to retrieve your location");
};
// Routing
function calculateRouteFromAtoB (from, to) {
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
    onSuccess,
    onError
  );
}
function onSuccess(result) {
  var route = result.routes[0];
  addRouteShapeToMap(route);
  addManueversToMap(route);
  addSummaryToPanel(route);
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
  routeInstructionsContainer.appendChild(summaryDiv);
}
/*
var ajax = $.ajax({
  url : wfsUrl,
  dataType : 'json',
  jsonCallback : 'callback',
  type: 'GET',
  success : function (response) {
    console.log(response.features);
          
  }
});
*/