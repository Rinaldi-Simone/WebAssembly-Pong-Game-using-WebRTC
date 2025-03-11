// ui.js - Gestione dell'interfaccia utente

// Riferimenti agli elementi delle varie schermate
const elements = {
  homeScreen: document.getElementById('homeScreen'),
  roomListScreen: document.getElementById('roomListScreen'),
  lobbyScreen: document.getElementById('lobbyScreen'),
  gameScreen: document.getElementById('gameScreen'),
  roomListUl: document.getElementById('roomList'),
  lobbyStatus: document.getElementById('lobbyStatus'),
  lobbyControls: document.getElementById('lobbyControls'),
  logDiv: document.getElementById('log'),
  winnerOverlay: document.getElementById('winnerOverlay'),
  winnerMessage: document.getElementById('winnerMessage')
};

// Helper: aggiunge un messaggio al log
function addLog(message) {
  const p = document.createElement('p');
  p.textContent = message;
  elements.logDiv.appendChild(p);
  elements.logDiv.scrollTop = elements.logDiv.scrollHeight;
  console.log(message);
}

// Aggiorna lo stato nella lobby o nelle altre sezioni
function updateStatus(message) {
  if (elements.lobbyScreen.style.display === 'block') {
    elements.lobbyStatus.textContent = message;
  }
}

// Funzione per mostrare una schermata e nascondere le altre
// Funzione per mostrare una schermata e nascondere le altre
function showScreen(screen) {
  elements.homeScreen.style.display = 'none';
  elements.roomListScreen.style.display = 'none';
  elements.lobbyScreen.style.display = 'none';
  elements.gameScreen.style.display = 'none';
  
  screen.style.display = 'block';  // Usa il parametro screen direttamente
}


// Mostra l'overlay con il messaggio di fine partita
function showWinner(message) {
  elements.winnerMessage.textContent = message;
  elements.winnerOverlay.style.display = 'flex';
}

// Lobby: mostra il pulsante "Pronto"
function showReadyButton(socket, roomId) {
  if (!document.getElementById('readyButton')) {
    const btn = document.createElement('button');
    btn.id = 'readyButton';
    btn.textContent = 'Pronto';
    btn.addEventListener('click', () => {
      socket.emit('ready', roomId);
      updateStatus('Pronto! In attesa che l\'altro giocatore sia pronto...');
      addLog('Hai premuto \'Pronto\'. In attesa dell\'altro giocatore...');
      btn.disabled = true;
    });
    elements.lobbyControls.appendChild(btn);
  }
}


// --- Gestione della navigazione delle schermate ---
// Inizializza gli event listener per i pulsanti dell'UI
function initUIEventListeners(socket, callbacks) {
  // Home Screen
  document.getElementById('btnCreateRoom').addEventListener('click', () => {
    const roomId = prompt('Inserisci un ID per la stanza:');
    if (roomId) {
      socket.emit('create_room', roomId);
      addLog('Stanza creata: ' + roomId);
      showScreen(elements.lobbyScreen);
      updateStatus('Attesa dell\'altro giocatore...');
      callbacks.onRoomCreated(roomId);
    }
  });

  document.getElementById('btnJoinRoom').addEventListener('click', () => {
    socket.emit('list_rooms');
    showScreen(elements.roomListScreen);
  });

  document.getElementById('btnRefreshRooms').addEventListener('click', () => {
    socket.emit('list_rooms');
  });

  document.getElementById('btnBackHomeFromRooms')
      .addEventListener('click', () => {
        showScreen(elements.homeScreen);
      });

  document.getElementById('btnBackToLobby').addEventListener('click', () => {
    callbacks.onCleanup();
    location.reload();
  });

  document.getElementById('btnRestartGame').addEventListener('click', () => {
    callbacks.onCleanup();
    location.reload();
  });

  document.getElementById('btnReturnHome').addEventListener('click', () => {
    callbacks.onCleanup();
    location.reload();
  });
}

// Esporta le funzioni e gli elementi
export {
  elements,
  addLog,
  updateStatus,
  showScreen,
  showWinner,
  showReadyButton,
  initUIEventListeners,
}