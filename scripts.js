// Initialize Firebase
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
  
  let playerMarkers = {};
  let playerId = null;
  let currentRoom = null;
  let playerName = null;
  let userPosition = { lat: 0, lng: 0 };
  
  // Update Position
  function updatePosition(position) {
    if (!currentRoom || !playerId) return;
  
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    userPosition = { lat, lng };
  
    const playerData = {
      lat: lat,
      lng: lng,
      speed: position.coords.speed || 0,
      direction: position.coords.heading || 0,
      role: 'hider',
      name: playerName
    };
    
    database.ref('rooms/' + currentRoom + '/players/' + playerId).set(playerData);
  }
  
  // Show Geolocation Error
  function showError(error) {
    alert("Error in getting geolocation: " + error.message);
  }
  
  // Start Geolocation
  function startGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(updatePosition, showError, { enableHighAccuracy: true });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }
  
  // Join Room
  function joinRoom() {
    const name = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim();
    if (name === '' || roomCode === '') {
      document.getElementById('room-message').innerText = "Please enter your name and room code.";
      return;
    }
  
    playerName = name;
    currentRoom = roomCode;
  
    database.ref('rooms/' + roomCode).once('value').then((snapshot) => {
      if (snapshot.exists()) {
        playerId = `player_${Math.floor(Math.random() * 10000)}`;
        database.ref('rooms/' + roomCode + '/players/' + playerId).set({
          name: playerName,
          lat: 0,
          lng: 0,
          speed: 0,
          direction: 0,
          role: 'hider'
        });
  
        // Check for existing players
        database.ref('rooms/' + roomCode + '/players').once('value').then((snapshot) => {
          const players = snapshot.val();
          if (players) {
            // Restore player state
            for (const id in players) {
              if (id !== playerId) {
                playerMarkers[id] = players[id];
              }
            }
          }
  
          document.getElementById('auth-box').style.display = 'none';
          document.getElementById('stats-box').style.display = 'block';
          startGeolocation();
        });
      } else {
        document.getElementById('room-message').innerText = "Room not found.";
      }
    }).catch(error => {
      document.getElementById('room-message').innerText = "Error: " + error.message;
    });
  }
  
  // Create Room
  function createRoom() {
    const name = document.getElementById('player-name').value.trim();
    if (name === '') {
      document.getElementById('room-message').innerText = "Please enter your name.";
      return;
    }
  
    playerName = name;
    const roomCode = Math.floor(10000 + Math.random() * 90000).toString();
    currentRoom = roomCode;
    
    database.ref('rooms/' + roomCode).set({
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      playerId = `player_${Math.floor(Math.random() * 10000)}`;
      database.ref('rooms/' + roomCode + '/players/' + playerId).set({
        name: playerName,
        lat: 0,
        lng: 0,
        speed: 0,
        direction: 0,
        role: 'host'
      });
  
      document.getElementById('auth-box').style.display = 'none';
      document.getElementById('stats-box').style.display = 'block';
      startGeolocation();
      alert("Room created! Share this code with your friends: " + roomCode);
    }).catch(error => {
      document.getElementById('room-message').innerText = "Error: " + error.message;
    });
  }
  
  // Handle Gyro Data
  window.addEventListener('deviceorientation', (event) => {
    const infoBox = document.getElementById('stats-box');
    const playerDistances = [];
  
    database.ref('rooms/' + currentRoom + '/players').once('value').then((snapshot) => {
      const players = snapshot.val();
      for (const id in players) {
        const player = players[id];
        const distance = getDistance(userPosition.lat, userPosition.lng, player.lat, player.lng);
        playerDistances.push({
          id: id,
          distance: distance,
          player: player
        });
      }
  
      // Sort by distance
      playerDistances.sort((a, b) => a.distance - b.distance);
      const closestPlayer = playerDistances[0];
  
      if (closestPlayer) {
        infoBox.innerHTML = `
          Player: ${closestPlayer.player.name} <br>
          Speed: ${closestPlayer.player.speed} m/s <br>
          Direction: ${closestPlayer.player.direction}° <br>
          Distance: ${(closestPlayer.distance).toFixed(2)} feet <br>
          Role: ${closestPlayer.player.role}
        `;
      } else {
        infoBox.innerHTML = 'No players in range';
      }
    }).catch(error => {
      infoBox.innerHTML = 'Error: ' + error.message;
    });
  });
  
  // Calculate Distance
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 5280; // Convert miles to feet
    return distance;
    }
    
    // Degrees to Radians
    function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
    }
  