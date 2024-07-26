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
  let playerRole = null;
  let userPosition = { lat: 0, lng: 0 };
  let proximityAlertSent = {};
  
  const catchSound = new Audio('catch_sound.mp3');
  const proximitySound = new Audio('proximity_sound.mp3');
  
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
      role: playerRole,
      name: playerName,
      catches: playerRole === 'seeker' ? (playerMarkers[playerId] ? playerMarkers[playerId].catches || 0 : 0) : 0
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
    playerRole = document.querySelector('input[name="role"]:checked').value;
  
    database.ref('rooms/' + roomCode).once('value').then((snapshot) => {
      if (snapshot.exists()) {
        playerId = `player_${Math.floor(Math.random() * 10000)}`;
        database.ref('rooms/' + roomCode + '/players/' + playerId).set({
          name: playerName,
          lat: 0,
          lng: 0,
          speed: 0,
          direction: 0,
          role: playerRole,
          catches: 0
        }).then(() => {
          document.getElementById('auth-box').style.display = 'none';
          document.getElementById('game-area').style.display = 'block';
          document.getElementById('leaderboard').style.display = 'block';
          document.getElementById('leave-game-button').style.display = 'block';
          startGeolocation();
          updateLeaderboard();
        });
      } else {
        document.getElementById('room-message').innerText = "Room does not exist.";
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
    playerRole = document.querySelector('input[name="role"]:checked').value;
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
        role: playerRole,
        catches: 0
      });
  
      document.getElementById('auth-box').style.display = 'none';
      document.getElementById('game-area').style.display = 'block';
      document.getElementById('leaderboard').style.display = 'block';
      document.getElementById('leave-game-button').style.display = 'block';
      startGeolocation();
      alert("Room created! Share this code with your friends: " + roomCode);
      updateLeaderboard();
    }).catch(error => {
      document.getElementById('room-message').innerText = "Error: " + error.message;
    });
  }
  
  // Leave Game
  function leaveGame() {
    if (!currentRoom || !playerId) return;
  
    database.ref('rooms/' + currentRoom + '/players/' + playerId).remove().then(() => {
      if (playerRole === 'seeker') {
        database.ref('rooms/' + currentRoom).once('value').then(snapshot => {
          let activeSeekers = snapshot.child('players').filter(player => player.role === 'seeker').length;
          if (activeSeekers === 0) {
            database.ref('rooms/' + currentRoom).remove();
          }
        });
      }
  
      document.getElementById('auth-box').style.display = 'block';
      document.getElementById('game-area').style.display = 'none';
      document.getElementById('leaderboard').style.display = 'none';
      document.getElementById('leave-game-button').style.display = 'none';
      playerId = null;
      currentRoom = null;
    }).catch(error => {
      console.error("Error removing player: " + error.message);
    });
  }
  
  // Update Leaderboard
  function updateLeaderboard() {
    if (!currentRoom) return;
  
    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
      let leaderboardHtml = '<h2>Leaderboard</h2><button onclick="toggleLeaderboard()">Show Leaderboard</button><div id="leaderboard-content">';
      snapshot.forEach(playerSnapshot => {
        const player = playerSnapshot.val();
        leaderboardHtml += `<div class="${player.role}">
          <strong>${player.name}</strong> - ${player.role}
          ${player.role === 'seeker' ? ` - Catches: ${player.catches}` : ''}
        </div>`;
      });
      leaderboardHtml += '</div>';
      document.getElementById('leaderboard-content').innerHTML = leaderboardHtml;
    }).catch(error => {
      console.error("Error updating leaderboard: " + error.message);
    });
  }
  
  // Toggle Leaderboard
  function toggleLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboard-content');
    if (leaderboardContent.style.display === 'none') {
      leaderboardContent.style.display = 'block';
    } else {
      leaderboardContent.style.display = 'none';
    }
  }
  
  // Check Proximity and Handle Auto-Tags
  function checkProximity() {
    if (!currentRoom || !playerId) return;
  
    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
      snapshot.forEach(otherPlayerSnapshot => {
        if (otherPlayerSnapshot.key !== playerId) {
          const otherPlayer = otherPlayerSnapshot.val();
          const distance = calculateDistance(userPosition.lat, userPosition.lng, otherPlayer.lat, otherPlayer.lng);
  
          if (distance < 1) {
            if (playerRole === 'seeker') {
              // Seeker catches the hider
              database.ref('rooms/' + currentRoom + '/players/' + otherPlayerSnapshot.key).update({ role: 'seeker', catches: (otherPlayer.catches || 0) + 1 });
              displayPopup(`You caught ${otherPlayer.name}!`);
              catchSound.play();
            }
            // Update caught hider's role
            if (otherPlayer.role === 'hider' && distance < 1) {
              database.ref('rooms/' + currentRoom + '/players/' + otherPlayerSnapshot.key).update({ role: 'seeker', catches: (otherPlayer.catches || 0) + 1 });
              displayPopup(`${otherPlayer.name} is now a seeker!`);
              catchSound.play();
            }
          } else if (distance < 15 && !proximityAlertSent[otherPlayerSnapshot.key]) {
            displayPopup(`Proximity alert: ${otherPlayer.name} is ${Math.round(distance)} feet away.`);
            proximitySound.play();
            proximityAlertSent[otherPlayerSnapshot.key] = true;
          }
        }
      });
    }).catch(error => {
      console.error("Error checking proximity: " + error.message);
    });
  }
  
  // Update UI with Player Info
  function updateUI() {
    if (!currentRoom || !playerId) return;
  
    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
      let playerInfoHtml = '';
      snapshot.forEach(otherPlayerSnapshot => {
        if (otherPlayerSnapshot.key !== playerId) {
          const otherPlayer = otherPlayerSnapshot.val();
          const distance = calculateDistance(userPosition.lat, userPosition.lng, otherPlayer.lat, otherPlayer.lng);
          if (distance < 15) {
            playerInfoHtml += `<div class="${otherPlayer.role}" style="position: absolute; top: ${Math.random() * 100}%; left: ${Math.random() * 100}%; border-radius: 50%; width: 50px; height: 50px;">
              <strong>${otherPlayer.name}</strong><br>Distance: ${Math.round(distance)} ft<br>Speed: ${Math.round(otherPlayer.speed || 0)} ft/s
            </div>`;
          }
        }
      });
      document.getElementById('player-info').innerHTML = playerInfoHtml;
    }).catch(error => {
      console.error("Error updating UI: " + error.message);
    });
  }
  
  // Set up periodic updates
  setInterval(() => {
    checkProximity();
    updateUI();
  }, 5000);
  