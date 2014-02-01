

/**
 *  Logs shuttle location to console
 */
 function traceLoc()
 {
    console.log("shuttle.position \n .altitude="+shuttle.position.altitude+
        "\n .heading="+shuttle.position.heading+
        "\n .latitude="+shuttle.position.latitude+
        "\n .longitude="+shuttle.position.longitude);
 }

/**
 * Used to log out each passenger as they're placed on the map.
 * Testing purposes only.
 */
function logPassenger(passenger)
{
	console.log("PASSENGER:");
	for (var property in passenger)
	{
		var member = passenger[property]
		console.log("\t" + passenger[property] + " = " + member);
	}
}

/**
 * Iterate through passengers and their houses
 * to understand how many passengers (not freshman) can
 * be dropped off to count towards points
 */
function calculateMaxDropOffs()
{
	for (var i = 0; i < PASSENGERS.length; i++)
	{
		var p = PASSENGERS[i];
		for (house in HOUSES)
		{
			if (p.house == house)
			{
				maxDropOffs++;
				break;
			}
		}
	}
}

/**
 * Sets the passenger into the shuttle
 */
function seatPassenger(passenger)
{
	// set seat n to this passenger, and increment occupied seats
	console.log("Putting "+passenger.name+" on the bus!");
	
	// set the passenger's lat/lng to null, now they will be on the bus, ie not on the map
	passenger.lat = null;
	passenger.lng = null;
	passenger.pickedUp = 1;

    for (var i = 0; i < SEATS; i++)
    {
    	if (shuttle.seats[i] == null)
    	{
    		// seat new passenger here
    		shuttle.seats[i] = passenger;
    		occupiedSeats++;
    		break;
    	}
    }

    
}

function removePlacemark(passenger)
{
	var features = earth.getFeatures();
	features.removeChild(passenger.placemark);
}

function removeMarker(passenger)
{
	passenger.marker.setMap(null);
}

/**
 * Deprecated. I thought we had to rearrange passengers on the bus.
 */
function adjustShuttleSeats()
{
	console.log("adjustShuttleSeats");

	// going to make another array in which to correctly arrange the seats
	// then attribute the elements of this new array to shuttle.seats

	var holderArray = [];
	haIndex = 0;
	
	for (var i = 0; i < SEATS; i++)
	{
		if (shuttle.seats[i] != null)
		{
			holderArray[haIndex] = shuttle.seats[i];
			haIndex++;
		}

		shuttle.seats[i] = null;
	}

	occupiedSeats = 0;
	for (var i = 0; i < SEATS; i++)
	{
		if (holderArray[i] != null)
		{
			seatPassenger(holderArray[i]);
		}
	}
}

/**
 * Returns the object in HOUSES which matched the passenger's house.
 */
function getHouseObject(passenger)
{
	for (house in HOUSES)
	{
		if (passenger.house == house)
		{
			return HOUSES[house];
		}
	}
}

/**
 *	Use the UI to announce that someone is home.
 */
function announceDropOff(passenger)
{
	$("#announcements").html(passenger.name + " is home at " + passenger.house);
}

function announcePickup(passenger)
{
	$("#announcements").html(passenger.name + " is on the shuttle!");
}
