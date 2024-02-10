let map;
let locations = [];
let locationStack = [];
let selectedLocations = [];
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
    });
}


// function to add location and also save in db

async function addAddress() {
    const addressInput = document.getElementById("addressInput");
    const address = addressInput.value.trim();
    if (address !== "") {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, async (results, status) => {
            if (status === "OK") {
                const location = results[0].geometry.location;
                const marker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: address,
                });
                locations.push(location);
                selectedLocations.push({ title: address, location: location });

                try {
                    const response = await fetch('http://localhost:3000/add-location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ location: address })
                    });

                    if (!response.ok) {
                        console.log(response)
                        throw new Error('Failed to add location');
                    }

                    const data = await response.json();
                    console.log('Location added:', data);
                } catch (error) {
                    console.error('Error adding location:', error);
                }

                map.panTo(location);
                map.setZoom(12);
            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
        addressInput.value = "";
    }
}


// function to add plan route 
function planRoute() {
    if (locations.length < 2) {
        alert("Please add at least two locations.");
        return;
    }

    const technicianAddress = prompt("Enter technician's address (default starting point):");
    if (technicianAddress === null || technicianAddress.trim() === "") {
        alert("Technician's address is required.");
        return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: technicianAddress }, (results, status) => {
        if (status === "OK") {
            const technicianLocation = results[0].geometry.location;
            locations.unshift(technicianLocation);
            const technicianMarker = new google.maps.Marker({
                position: technicianLocation,
                map: map,
                title: technicianAddress,
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });

            selectedLocations.push({ title: technicianAddress, location: technicianLocation });

            const path = [0];
            let current = 0;
            let minDist;
            while (path.length < locations.length) {
                minDist = Number.MAX_VALUE;
                let next;
                for (let i = 0; i < locations.length; i++) {
                    if (!path.includes(i)) {
                        const dist = google.maps.geometry.spherical.computeDistanceBetween(locations[current], locations[i]);
                        if (dist < minDist) {
                            minDist = dist;
                            next = i;
                        }
                    }
                }
                path.push(next);
                current = next;
            }

            const waypoints = path.map(index => ({
                location: locations[index],
                stopover: true
            }));

            const request = {
                origin: locations[path[0]],
                destination: locations[path[path.length - 1]],
                waypoints: waypoints.slice(1, -1),
                travelMode: google.maps.TravelMode.DRIVING
            };

            const directionsService = new google.maps.DirectionsService();

            directionsService.route(request, function(response, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    const directionsRenderer = new google.maps.DirectionsRenderer({
                        map: map,
                        directions: response,
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: "#FF0000",
                            strokeOpacity: 1.0,
                            strokeWeight: 4
                        }
                    });
                } else {
                    alert("Error: " + status);
                }
            });
        } else {
            alert("Geocode was not successful for the following reason: " + status);
        }
    });
}

// function to mark as complete and save in DB

async function markLocationAsDone() {
    if (selectedLocations.length === 0) {
        alert("No locations available.");
        return;
    }

    let locationName = prompt("Enter the location you want to mark as Done:");
    if (!locationName || locationName.trim() === "") {
        alert("Please enter a valid location name.");
        return;
    }
    locationName = locationName.trim().toLowerCase(); // Convert to lowercase and trim whitespace

    const locationObject = selectedLocations.find(location => location.title.toLowerCase().trim() === locationName);
    if (locationObject) {
        markLocationOnMap(locationObject);

        // Call the backend API to mark location as complete
        try {
            const response = await fetch('http://localhost:3000/mark-complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locationName: locationObject.title })
            });

            if (!response.ok) {
                throw new Error('Failed to mark location as complete');
            }

            const data = await response.json();
            console.log('Location marked as complete:', data);
        } catch (error) {
            console.error('Error marking location as complete:', error);
        }
    } else {
        alert("This location was not previously selected by you.");
    }
}



function markLocationOnMap(locationObject) {
    const marker = new google.maps.Marker({
        position: locationObject.location,
        map: map,
        title: locationObject.title,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', 
            scaledSize: new google.maps.Size(55, 55)
        }
    });
}

const addLocationButton = document.getElementById("add-location-button");
addLocationButton.addEventListener("click", addAddress);
const completeButton = document.getElementById("complete-button");
completeButton.addEventListener("click", markLocationAsDone);
const planRouteButton = document.getElementById("plan-route-button");
planRouteButton.addEventListener("click", planRoute);


