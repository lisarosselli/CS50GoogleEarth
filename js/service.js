/**
 * service.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Implements a shuttle service.
 */

// default height
var HEIGHT = 0.8;

// default latitude
var LATITUDE = 42.3745615030193;

// default longitude
var LONGITUDE = -71.11803936751632;

// default heading
var HEADING = 1.757197490907891;

// default number of seats
var SEATS = 10;

// number of occupied seats
var occupiedSeats = 0;

// number of potential dropOffs (no freshmen)
var maxDropOffs = 0;

// default velocity
var VELOCITY = 50;

// global reference to shuttle's marker on 2D map
var bus = null;

// global reference to 3D Earth
var earth = null;

// global reference to 2D map
var map = null;

// global reference to shuttle
var shuttle = null;

// global reference to students previously dropped off
var dropOffs = [];

// load version 1 of the Google Earth API
google.load("earth", "1");

// load version 3 of the Google Maps API
google.load("maps", "3", {other_params: "sensor=false"});

// once the window has loaded
$(window).load(function() {

    // listen for keydown anywhere in body
    $(document.body).keydown(function(event) {
        $("#announcements").html("");
        return keystroke(event, true);
    });

    // listen for keyup anywhere in body
    $(document.body).keyup(function(event) {
        return keystroke(event, false);
    });

    // listen for click on Drop Off button
    $("#dropoff").click(function(event) {
        dropoff();
    });

    // listen for click on Pick Up button
    $("#pickup").click(function(event) {
        pickup();
    });

    $("#traceLoc").click(function(event) {
        traceLoc();
    });

    // load application
    load();
});

// unload application
$(window).unload(function() {
    unload();
});

/**
 * Upon keyCode, o, O, dropoff starting with first person on the shuttle (their house)
 */
function autoDropoff()
{
    if (dropOffs.length == maxDropOffs)
    {
        alert("You're done! Park the shuttle bus already.");
        return;
    }

    if (occupiedSeats >= 1)
    {
        for (var i = 0; i < SEATS; i++)
        {
            var p = shuttle.seats[i];
            if (p != null && p.droppedOff == null)
            {
                $("#announcements").html("Going to " + p.house +".");
                var house = getHouseObject(p);
                var newPosition = {altitude:0, latitude:house.lat, longitude:house.lng, heading:shuttle.heading};
                shuttle.position = newPosition;
                shuttle.localAnchorCartesian = V3.latLonAltToCartesian([newPosition.latitude, newPosition.longitude, newPosition.altitude]);
                shuttle.update();
                break;
            }
        }
    } 
    else
    {
        $("#announcements").html("No one to drop off.");
    }

    if (dropOffs.length == maxDropOffs)
    {
        alert("Everybody has been dropped off!");
    }
}

/**
 * Upon keyCode p, P, go and pickup
 */
function autoPickup()
{
    for (var i = 0; i < PASSENGERS.length; i++)
    {
        var p = PASSENGERS[i];
        if (p.pickedUp == null)
        {
            // go to this passenger;
            $("#announcements").html("Finding " + p.name + "!");
            p.pickedUp = 1;
            var newPosition = {altitude:0, latitude:p.lat, longitude:p.lng, heading:shuttle.heading};
            shuttle.position = newPosition;
            shuttle.localAnchorCartesian = V3.latLonAltToCartesian([newPosition.latitude, newPosition.longitude, newPosition.altitude]);
            shuttle.update();
            break;
        }
    }
}

/**
 * Renders seating chart.
 */
function chart()
{
    var html = "<ol start='0'>";
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        if (shuttle.seats[i] == null)
        {
            html += "<li>Empty Seat</li>";
        }
        else
        {
            passenger = shuttle.seats[i];
            house = getHouseObject(passenger);
            html += "<li>" + passenger.name + " to <img class='iconimg' src='" + house.img + "''>" + passenger.house + "</li>";
        }
    }
    html += "</ol>";
    $("#chart").html(html);
}

/**
 * Drops up passengers if their stop is nearby.
 */
var dropoffHouse;
var houseName;
function dropoff()
{
    if (dropOffs.length == maxDropOffs)
    {
        alert("You've dropped everyone (minus freshmen) off! Huzzah!");
        return;
    }

    // is shuttle close enough to any of the houses?
    for (house in HOUSES)
    {
        var d = Math.floor(shuttle.distance(HOUSES[house].lat, HOUSES[house].lng));
        if (d <= 30)
        {
            dropoffHouse = HOUSES[house];
            houseName = house;
            break;
        }
    }

    if (dropoffHouse == null)
    {
        $("#announcements").html("There is no nearby house.");
        return false;
    }

    // of the passengers on the bus, who belongs at this house?
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        var passenger = shuttle.seats[i];
        if (passenger != null)
        {
            if (passenger.house == houseName)
            {
                console.log("Dropping off "+passenger.name+" at "+houseName);
                dropOffs.push(passenger);
                passenger.droppedOff = 1;
                shuttle.seats[i] = null;
                occupiedSeats--;

                $("#points").html(dropOffs.length);
                announceDropOff(passenger);
            }
        } 
    }

    chart();

    if (dropOffs.length == maxDropOffs)
    {
        alert("You've dropped everyone (minus freshmen) off! Huzzah!");
    }
}

/**
 * Called if Google Earth fails to load.
 */
function failureCB(errorCode) 
{
    // report error unless plugin simply isn't installed
    if (errorCode != ERR_CREATE_PLUGIN)
    {
        alert(errorCode);
    }
}

/**
 * Handler for Earth's frameend event.
 */
function frameend() 
{
    shuttle.update();
}

/**
 * Called once Google Earth has loaded.
 */
function initCB(instance) 
{
    // retain reference to GEPlugin instance
    earth = instance;

    // specify the speed at which the camera moves
    earth.getOptions().setFlyToSpeed(100);

    // show buildings
    earth.getLayerRoot().enableLayerById(earth.LAYER_BUILDINGS, true);

    // disable terrain (so that Earth is flat)
    earth.getLayerRoot().enableLayerById(earth.LAYER_TERRAIN, false);

    // prevent mouse navigation in the plugin
    earth.getOptions().setMouseNavigationEnabled(false);

    // instantiate shuttle
    shuttle = new Shuttle({
        heading: HEADING,
        height: HEIGHT,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        planet: earth,
        seats: SEATS,
        velocity: VELOCITY
    });

    // synchronize camera with Earth
    google.earth.addEventListener(earth, "frameend", frameend);

    // synchronize map with Earth
    google.earth.addEventListener(earth.getView(), "viewchange", viewchange);

    // update shuttle's camera
    shuttle.updateCamera();

    // show Earth
    earth.getWindow().setVisibility(true);

    // render seating chart
    chart();

    // populate Earth with passengers and houses
    populate();

    // count up maxDropOffs by comparing passengers to houses
    // ie, do not count freshmen
    calculateMaxDropOffs();
}

/**
 * Handles keystrokes.
 */
function keystroke(event, state)
{
    // ensure we have event
    if (!event)
    {
        event = window.event;
    }

    // left arrow
    if (event.keyCode == 37)
    {
        shuttle.states.turningLeftward = state;
        return false;
    }

    // up arrow
    else if (event.keyCode == 38)
    {
        shuttle.states.tiltingUpward = state;
        return false;
    }

    // right arrow
    else if (event.keyCode == 39)
    {
        shuttle.states.turningRightward = state;
        return false;
    }

    // down arrow
    else if (event.keyCode == 40)
    {
        shuttle.states.tiltingDownward = state;
        return false;
    }

    // A, a
    else if (event.keyCode == 65 || event.keyCode == 97)
    {
        shuttle.states.slidingLeftward = state;
        return false;
    }

    // D, d
    else if (event.keyCode == 68 || event.keyCode == 100)
    {
        shuttle.states.slidingRightward = state;
        return false;
    }
  
    // S, s
    else if (event.keyCode == 83 || event.keyCode == 115)
    {
        shuttle.states.movingBackward = state;     
        return false;
    }

    // W, w
    else if (event.keyCode == 87 || event.keyCode == 119)
    {
        shuttle.states.movingForward = state;    
        return false;
    }

    // P, p
    else if (event.keyCode == 80 || event.keyCode == 112)
    {
        if (state)
        {
            autoPickup();
        }
        return false;
    }

    // O, o
    else if (event.keyCode == 79 || event.keyCode == 111)
    {
        if (state)
        {
            autoDropoff();
        }
        return false;
    }

  
    return true;
}

/**
 * Loads application.
 */
function load()
{
    // embed 2D map in DOM
    var latlng = new google.maps.LatLng(LATITUDE, LONGITUDE);
    map = new google.maps.Map($("#map").get(0), {
        center: latlng,
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        scrollwheel: false,
        zoom: 17,
        zoomControl: true
    });

    // prepare shuttle's icon for map
    bus = new google.maps.Marker({
        icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/bus.png",
        map: map,
        title: "you are here"
    });

    // embed 3D Earth in DOM
    google.earth.createInstance("earth", initCB, failureCB);
}

/**
 * Picks up nearby passengers.
 */
function pickup()
{
    var result = doPickup();
    switch (result)
    {
        case 0:
            //$("#announcements").html("Just picked someone up!");
            break;
        case 1:
            $("#announcements").html("There is no one near the shuttle.");
            break;
        case 2:
            $("#announcements").html("No more seats on the shuttle!");
            break;
        default:
            // do nothing
            break;
    }
}

function doPickup()
{
    // if all seats are occupied, alert the user
    if (occupiedSeats >= SEATS)
    {
        return 2;
    } 

    // are any passengers close enough?
    for (var i = 0; i < PASSENGERS.length; i++)
    {
        // test for distance
        var p = PASSENGERS[i];
        var d = Math.floor(shuttle.distance(p.lat, p.lng));
        var h = p.house;

        // if distance is fine, further, check for not frosh house
        if (d <= 15)
        {
            for (property in HOUSES)
            {
                var houseName = property;
                if (h == houseName)
                {
                    seatPassenger(p);
                    removePlacemark(p);
                    removeMarker(p);
                    announcePickup(p);
                    chart();
                    return 0;
                } 
            }
        }
    }

    return 1;
}

/**
 * Populates Earth with passengers and houses.
 */
function populate()
{
    // mark houses
    for (var house in HOUSES)
    {
        // plant house on map
        new google.maps.Marker({
            icon: "https://google-maps-icons.googlecode.com/files/home.png",
            map: map,
            position: new google.maps.LatLng(HOUSES[house].lat, HOUSES[house].lng),
            title: house
        });
    }

    // get current URL, sans any filename
    var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);

    // scatter passengers
    for (var i = 0; i < PASSENGERS.length; i++)
    {
        // pick a random building
        var building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];

        // prepare placemark
        var placemark = earth.createPlacemark("");
        placemark.setName(PASSENGERS[i].name + " to " + PASSENGERS[i].house);

        // prepare icon
        var icon = earth.createIcon("");
        icon.setHref(url + "/img/" + PASSENGERS[i].username + ".jpg");

        // prepare style
        var style = earth.createStyle("");
        style.getIconStyle().setIcon(icon);
        style.getIconStyle().setScale(4.0);

        // prepare stylemap
        var styleMap = earth.createStyleMap("");
        styleMap.setNormalStyle(style);
        styleMap.setHighlightStyle(style);

        // associate stylemap with placemark
        placemark.setStyleSelector(styleMap);

        // prepare point
        var point = earth.createPoint("");
        point.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
        point.setLatitude(building.lat);
        point.setLongitude(building.lng);
        point.setAltitude(0.0);

        // associate placemark with point
        placemark.setGeometry(point);

        // add placemark to Earth
        earth.getFeatures().appendChild(placemark);

        // save placemark to passenger for later use
        PASSENGERS[i].placemark = placemark;

        // add marker to map
        var marker = new google.maps.Marker({
            icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/man.png",
            map: map,
            position: new google.maps.LatLng(building.lat, building.lng),
            title: PASSENGERS[i].name + " at " + building.name
        });

        PASSENGERS[i].lat = building.lat;
        PASSENGERS[i].lng = building.lng;
        PASSENGERS[i].marker = marker;
        PASSENGERS[i].pickedUp = null;
        PASSENGERS[i].droppedOff = null;

        //logPassenger(PASSENGERS[i]);
    }
}

/**
 * Handler for Earth's viewchange event.
 */
function viewchange() 
{
    // keep map centered on shuttle's marker
    var latlng = new google.maps.LatLng(shuttle.position.latitude, shuttle.position.longitude);
    map.setCenter(latlng);
    bus.setPosition(latlng);
}

/**
 * Unloads Earth.
 */
function unload()
{
    google.earth.removeEventListener(earth.getView(), "viewchange", viewchange);
    google.earth.removeEventListener(earth, "frameend", frameend);
}
