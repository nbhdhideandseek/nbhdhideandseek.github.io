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
let userName = null;
let lastUpdated = {};
let userNames = {}; // Track user names to avoid duplicates
let activeDivs = {}; // Track active user divs to avoid duplicates

// Function to initialize Firebase Anonymous Authentication
function initialize() {
    const username = document.getElementById('username').value.trim();
    if (username === "") {
        alert("Please enter a username.");
        return;
    }

    // Check for unique username
    database.ref('usernames').once('value').then(snapshot => {
        const usernames = snapshot.val() || {};
        if (Object.values(usernames).includes(username)) {
            alert("Username is already taken. Please choose another.");
            return;
        }

        // Sign in anonymously
        auth.signInAnonymously().then(() => {
            userId = auth.currentUser.uid;
            userName = username;
            document.getElementById('setup').style.display = 'none';
            document.getElementById('status').style.display = 'block';
            document.getElementById('status-text').textContent = 'Status: Tracking...';

            // Store username in Firebase
            database.ref('users/' + userId).set({ username: username });
            database.ref('usernames/' + userId).set(username);
            
            // Start updating location
            updateLocation();
            
            // Set up real-time listeners
            setupRealTimeListeners();
        }).catch(error => {
            console.error("Error signing in anonymously:", error);
        });
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
                lastUpdated[userId] = Date.now(); // Update last timestamp
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

// Function to update distances and manage user divs
function setupRealTimeListeners() {
    // Listen for changes in users
    database.ref('locations').on('value', snapshot => {
        const locations = snapshot.val();
        if (locations) {
            Object.entries(locations).forEach(([otherUserId, otherLocation]) => {
                if (otherUserId !== userId) {
                    const distance = calculateDistance(
                        locations[userId].latitude,
                        locations[userId].longitude,
                        otherLocation.latitude,
                        otherLocation.longitude
                    );

                    // Create or update user div
                    if (!activeDivs[otherUserId]) {
                        // Create new div if not exists
                        const userDiv = document.createElement('div');
                        userDiv.className = 'user-div';
                        userDiv.id = 'user-' + otherUserId;

                        // Get the user's name from Firebase
                        database.ref('users/' + otherUserId + '/username').once('value').then(nameSnapshot => {
                            const otherUserName = nameSnapshot.val() || 'Unknown';
                            userNames[otherUserId] = otherUserName;
                            
                            userDiv.innerHTML = `
                                <p class="user-name">${userNames[otherUserId]}</p>
                                <p class="user-distance">Distance: ${(distance * 3.28084).toFixed(2)} feet</p>
                            `;
                            document.getElementById('users-list').appendChild(userDiv);
                            activeDivs[otherUserId] = userDiv;
                        }).catch(error => {
                            console.error("Error fetching username:", error);
                        });
                    } else {
                        // Update existing div
                        const userDiv = activeDivs[otherUserId];
                        userDiv.querySelector('.user-distance').textContent = `Distance: ${(distance * 3.28084).toFixed(2)} feet`;
                    }

                    // Update last updated timestamp
                    lastUpdated[otherUserId] = Date.now();
                }
            });

            // Remove inactive users
            removeInactiveUsers();
        }
    });

    // Clean up inactive users every 10 seconds
    setInterval(removeInactiveUsers, 10000);
}

// Function to remove inactive user divs
function removeInactiveUsers() {
    const now = Date.now();
    const usersList = document.getElementById('users-list');

    Object.entries(lastUpdated).forEach(([userId, lastUpdateTime]) => {
        if (now - lastUpdateTime > 10000) { // 10 seconds
            const userDiv = activeDivs[userId];
            if (userDiv) {
                usersList.removeChild(userDiv);
                delete activeDivs[userId];
                delete lastUpdated[userId];
                delete userNames[userId];
                database.ref('locations/' + userId).remove(); // Clean up Firebase data
                database.ref('users/' + userId).remove();
                database.ref('usernames/' + userId).remove();
            }
        }
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
