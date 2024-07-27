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
const auth = firebase.auth();
const database = firebase.database();

let userId = null;

// Function to initialize Firebase Anonymous Authentication
function initialize() {
    const username = document.getElementById('username').value.trim();
    if (username === "") {
        alert("Please enter a username.");
        return;
    }
    
    // Sign in anonymously
    auth.signInAnonymously().then(() => {
        userId = auth.currentUser.uid;
        document.getElementById('setup').style.display = 'none';
        document.getElementById('status').style.display = 'block';
        document.getElementById('status-text').textContent = 'Status: Tracking...';
        
        // Store username in Firebase
        database.ref('users/' + userId).set({ username: username });
        
        // Start updating location
        updateLocation();
        
        // Start distance calculation
        setInterval(updateDistance, 2000);
    }).catch(error => {
        console.error("Error signing in anonymously:", error);
    });
}

// Function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of the Earth in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    return distance;
}

// Function to update user's location and send to Firebase
function updateLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp // Add timestamp for synchronization
            };
            
            // Store user's location in Firebase
            if (userId) {
                database.ref('locations/' + userId).set(userLocation)
                    .catch(error => {
                        console.error("Error writing location data:", error);
                    });
            }
        }, error => {
            console.error("Error getting location:", error);
        }, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        });
    } else {
        document.getElementById('status-text').textContent = 'Geolocation is not supported by this browser.';
    }
}

// Function to calculate and display distance
function updateDistance() {
    if (!userId) return;
    
    database.ref('locations').once('value').then(snapshot => {
        const locations = snapshot.val();
        if (locations) {
            const userLocations = Object.entries(locations).filter(([key]) => key !== userId);
            if (userLocations.length > 0) {
                const [otherUserId, otherLocation] = userLocations[0];
                const userLocationRef = database.ref('locations/' + userId);
                userLocationRef.once('value').then(userLocationSnapshot => {
                    const userLocation = userLocationSnapshot.val();
                    if (userLocation) {
                        const distance = calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            otherLocation.latitude,
                            otherLocation.longitude
                        );
                        document.getElementById('distance').textContent = `Distance: ${distance.toFixed(2)} meters (${(distance * 3.28084).toFixed(2)} feet)`;
                    }
                }).catch(error => {
                    console.error("Error reading user location:", error);
                });
            }
        }
    }).catch(error => {
        console.error("Error reading locations:", error);
    });
}

// Request all necessary permissions
function requestPermissions() {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
            if (permissionStatus.state !== 'granted') {
                console.warn('Geolocation permission not granted.');
            }
        }).catch(error => {
            console.error("Error requesting permissions:", error);
        });
    }
}

requestPermissions();
