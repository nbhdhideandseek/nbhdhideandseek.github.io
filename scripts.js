// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyB6uVxF8NjNY4GpODW1h9Ha26zhhxs4Irw",
    authDomain: "nbhdhideandseek-9aa19.firebaseapp.com",
    databaseURL: "https://nbhdhideandseek-9aa19-default-rtdb.firebaseio.com",
    projectId: "nbhdhideandseek-9aa19",
    storageBucket: "nbhdhideandseek-9aa19.appspot.com",
    messagingSenderId: "628281251970",
    appId: "1:628281251970:web:312b19439a29156353bc9b"
});

const database = firebase.database();
let playerId = null;
let currentRoom = null;

// Request Permissions
async function requestPermissions() {
    try {
        await navigator.geolocation.getCurrentPosition(
            () => {},
            (error) => { console.error('Geolocation Error:', error); },
            { enableHighAccuracy: true }
        );

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Camera is accessed if this line is reached
        stream.getTracks().forEach(track => track.stop()); // Stop the stream
    } catch (error) {
        console.error('Permission Error:', error);
    }
}

// Create Room
function createRoom() {
    const roomName = prompt('Enter room name:');
    if (!roomName) return;

    database.ref('rooms').push({
        name: roomName,
        players: {}
    }).then((roomRef) => {
        currentRoom = roomRef.key;
        playerId = database.ref('rooms/' + currentRoom + '/players').push().key;
        const playerName = prompt('Enter your name:');
        const role = prompt('Are you a hider or seeker? (hider/seeker)');

        database.ref('rooms/' + currentRoom + '/players/' + playerId).set({
            name: playerName,
            role: role,
            catches: 0,
            closeCalls: 0,
            lat: 0,
            lng: 0,
            speed: 0
        });

        displayPopup(`Room created! Share this code with your friends: ${currentRoom}`);
    }).catch(error => console.error('Error creating room:', error));
}

// Join Room
function joinRoom() {
    const roomCode = prompt('Enter room code:');
    if (!roomCode) return;

    database.ref('rooms/' + roomCode).once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert('Room not found!');
            return;
        }

        currentRoom = roomCode;
        playerId = database.ref('rooms/' + currentRoom + '/players').push().key;
        const playerName = prompt('Enter your name:');
        const role = prompt('Are you a hider or seeker? (hider/seeker)');

        database.ref('rooms/' + currentRoom + '/players/' + playerId).set({
            name: playerName,
            role: role,
            catches: 0,
            closeCalls: 0,
            lat: 0,
            lng: 0,
            speed: 0
        });

        displayPopup('Joined the room!');
    }).catch(error => console.error('Error joining room:', error));
}

// Leave Game
function leaveGame() {
    if (!playerId || !currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players/' + playerId).remove().then(() => {
        displayPopup('You have left the room.');
        currentRoom = null;
        playerId = null;
        document.getElementById('leaderboard').style.display = 'none';
    }).catch(error => console.error('Error leaving room:', error));
}

// Toggle Leaderboard
function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.style.display = leaderboard.style.display === 'none' ? 'block' : 'none';
}

// Update Leaderboard
function updateLeaderboard() {
    if (!currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';
        let seekers = [];
        let hiders = [];

        snapshot.forEach(playerSnapshot => {
            const player = playerSnapshot.val();
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');
            playerElement.classList.add(player.role);
            playerElement.innerHTML = `${player.name} (${player.role}) - ${player.role === 'seeker' ? 'Caught: ' + player.catches : 'Close Calls: ' + player.closeCalls}`;
            if (player.role === 'seeker') {
                seekers.push(playerElement);
            } else {
                hiders.push(playerElement);
            }
        });

        seekers.sort((a, b) => {
            const aCatches = parseInt(a.innerText.split(': ')[1]);
            const bCatches = parseInt(b.innerText.split(': ')[1]);
            return bCatches - aCatches;
        });
        seekers.forEach(seeker => leaderboard.appendChild(seeker));
        hiders.forEach(hider => leaderboard.appendChild(hider));
    }).catch(error => console.error('Error updating leaderboard:', error));
}

// Update AR
function updateAR() {
    // Implement AR logic
}

// Check Proximity
function checkProximity() {
    if (!playerId || !currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        const currentPlayerData = snapshot.child(playerId).val();
        snapshot.forEach(otherPlayerSnapshot => {
            if (otherPlayerSnapshot.key !== playerId) {
                const otherPlayerData = otherPlayerSnapshot.val();
                const distance = calculateDistance(currentPlayerData.lat, currentPlayerData.lng, otherPlayerData.lat, otherPlayerData.lng);
                if (distance < 1) {
                    // Update the caught player
                    database.ref('rooms/' + currentRoom + '/players/' + otherPlayerSnapshot.key).update({
                        role: 'seeker'
                    });
                    // Update the catching player
                    database.ref('rooms/' + currentRoom + '/players/' + playerId).update({
                        catches: currentPlayerData.catches + 1
                    });
                    // Notify the players
                    displayPopup(`${otherPlayerData.name} has been caught and is now a seeker.`);
                } else if (distance < 5 && distance >= 1) {
                    // Update close calls for hiders
                    if (currentPlayerData.role === 'hider') {
                        database.ref('rooms/' + currentRoom + '/players/' + playerId).update({
                            closeCalls: currentPlayerData.closeCalls + 1
                        });
                    }
                } else if (distance < 15) {
                    // Proximity alert
                    displayPopup(`Proximity alert: ${otherPlayerData.name} is ${Math.round(distance)} feet away. Speed: ${Math.round(otherPlayerData.speed)} ft/s`);
                }
            }
        });
    }).catch(error => console.error('Error checking proximity:', error));
}

// Calculate Distance
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in miles
    return distance * 5280; // Convert miles to feet
}

function toRad(value) {
    return value * Math.PI / 180;
}

// Display Popup
function displayPopup(message) {
    const popupContainer = document.getElementById('popup-container');
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerText = message;
    popupContainer.appendChild(popup);
    setTimeout(() => {
        popupContainer.removeChild(popup);
    }, 5000);
}

// Event Listeners
document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('join-room-button').addEventListener('click', joinRoom);
document.getElementById('leave-game-button').addEventListener('click', leaveGame);
document.getElementById('toggle-leaderboard-button').addEventListener('click', toggleLeaderboard);

// Start AR and Geolocation
requestPermissions();
setInterval(updateAR, 1000);
 
