// socket-handler.js - Gestione eventi socket.io

import {addLog, elements, showReadyButton, showScreen, updateStatus} from './ui';

// Inizializza gli handler degli eventi socket.io
function initSocketHandlers(socket, gameState, callbacks) {
  // Quando il server conferma l'ingresso in una stanza
  socket.on('room_joined', (room) => {
    addLog('Sei entrato nella stanza: ' + room);
    gameState.roomId = room;
    showScreen(elements.lobbyScreen);
    updateStatus('Attesa degli altri giocatori...');
    socket.emit('get_room_players', room);
  });

  // Ricezione dell'elenco dei giocatori in stanza
  socket.on('room_players', (players) => {
    if (players[0] === socket.id) {
      gameState.role = 'host';
      addLog('Sei l\'host della stanza.');
    } else {
      gameState.role = 'client';
      addLog('Sei il client della stanza.');
    }
    showReadyButton(socket, gameState.roomId);
  });

  // Evento "room_list": il server restituisce le stanze disponibili
  socket.on('room_list', (rooms) => {
    elements.roomListUl.innerHTML = '';
    if (rooms.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Nessuna stanza disponibile';
      elements.roomListUl.appendChild(li);
    } else {
      rooms.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        li.addEventListener('click', () => {
          socket.emit('join_room', r);
          addLog('Richiesta per entrare nella stanza: ' + r);
        });
        elements.roomListUl.appendChild(li);
      });
    }
  });

  // Notifica se un giocatore lascia la stanza
  socket.on('player_left', (msg) => {
    addLog('Notifica: ' + msg);
    updateStatus(
        'Un giocatore ha lasciato la stanza. Attesa di un nuovo giocatore...');
    const readyBtn = document.getElementById('readyButton');
    if (readyBtn) readyBtn.disabled = false;
  });

  // Se il client diventa nuovo host
  socket.on('new_host', () => {
    gameState.role = 'host';
    addLog('Sei diventato il nuovo host.');
    Module.ccall('set_role', null, ['number'], [1]);
  });

  // Quando entrambi i giocatori sono pronti, il server invia 'start_game'
  socket.on('start_game', () => {
    addLog('Entrambi i giocatori sono pronti. Inizio partita...');
    updateStatus('Gioco in corso...');
    showScreen(elements.gameScreen);
    callbacks.onStartGame();
  });

  // WebRTC signaling
  socket.on('webrtc_offer', async (offer) => {
    if (gameState.role === 'client') {
      addLog('Ricevuto webrtc_offer.');
      await callbacks.onWebRTCOffer(offer);
    }
  });

  socket.on('webrtc_answer', async (answer) => {
    if (gameState.role === 'host') {
      addLog('Ricevuto webrtc_answer.');
      await callbacks.onWebRTCAnswer(answer);
    }
  });

  socket.on('webrtc_ice_candidate', async (candidate) => {
    await callbacks.onICECandidate(candidate);
  });
}

export {initSocketHandlers};