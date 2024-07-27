// Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyB6uVxF8NjNY4GpODW1h9Ha26zhhxs4Irw",
    authDomain: "nbhdhideandseek-9aa19.firebaseapp.com",
    databaseURL: "https://nbhdhideandseek-9aa19-default-rtdb.firebaseio.com",
    projectId: "nbhdhideandseek-9aa19",
    storageBucket: "nbhdhideandseek-9aa19.appspot.com",
    messagingSenderId: "628281251970",
    appId: "1:628281251970:web:312b19439a29156353bc9b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Function to update user's location and send to Firebase
function updateLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            // Store user's location in Firebase
            const userId = "user1"; // Change this based on your setup
            database.ref('locations/' + userId).set(userLocation)
                .catch(error => {
                    console.error("Error writing location data:", error);
                });
        }, error => {
            console.error("Error getting location:", error);
        }, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        });
    } else {
        document.getElementById('status').textContent = 'Geolocation is not supported by this browser.';
    }
}

// Function to calculate and display distance
function updateDistance() {
    const userId1 = "user1"; // Change this based on your setup
    const userId2 = "user2"; // Change this based on your setup

    database.ref('locations/' + userId1).once('value').then(snapshot1 => {
        const location1 = snapshot1.val();
        database.ref('locations/' + userId2).once('value').then(snapshot2 => {
            const location2 = snapshot2.val();
            if (location1 && location2) {
                const distance = calculateDistance(
                    location1.latitude,
                    location1.longitude,
                    location2.latitude,
                    location2.longitude
                );
                document.getElementById('distance').textContent = `Distance: ${distance.toFixed(2)} meters (${(distance * 3.28084).toFixed(2)} feet)`;
            }
        }).catch(error => {
            console.error("Error reading location data:", error);
        });
    }).catch(error => {
        console.error("Error reading location data:", error);
    });
}

// Start tracking location and update distance every 2 seconds
updateLocation();
setInterval(updateDistance, 2000);
