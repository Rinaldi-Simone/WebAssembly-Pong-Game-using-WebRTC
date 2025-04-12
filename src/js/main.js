// main.js - File principale che inizializza tutto

import {initGameFunctions} from './game.js';
import {initSocketHandlers} from './socket-handler.js';
import {initUIEventListeners, showScreen} from './ui.js';
import {WebRTCManager} from './webrtc.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inizializza socket.io
  const socket = io();

  // Stato del gioco
  const gameState = {
    role: null,  // "host" o "client"
    roomId: null,
    gameStarted: false
  };

  // Inizializza il gestore WebRTC
  const webRTCManager = new WebRTCManager(socket, gameState);

  // Inizializza le funzioni globali del gioco
  initGameFunctions(webRTCManager);

  // Callback per gli eventi UI
  const uiCallbacks = {
    onRoomCreated: (roomId) => {
      gameState.roomId = roomId;
    },
    onCleanup: () => {
      webRTCManager.cleanup();
    }
  };

  // Callback per gli eventi socket
  const socketCallbacks = {
    onStartGame: async () => {
      gameState.gameStarted = true;
      // Posiziona le webcam in base al ruolo
      const localVideo = document.getElementById('localVideo');
      const remoteVideo = document.getElementById('remoteVideo');
      const gameContainer = document.querySelector('.game-container');

      // Rimuove i video esistenti
      const videos = document.querySelectorAll('.webcam-container');
      videos.forEach(v => gameContainer.removeChild(v));

      // Ricrea in ordine corretto
      if (gameState.role === 'host') {
        // Host a sinistra
        const left = document.createElement('div');
        left.className = 'webcam-container';
        left.appendChild(localVideo);
        const right = document.createElement('div');
        right.className = 'webcam-container';
        right.appendChild(remoteVideo);
        gameContainer.prepend(left);
        gameContainer.appendChild(right);
      } else {
        // Client a destra
        const left = document.createElement('div');
        left.className = 'webcam-container';
        left.appendChild(remoteVideo);
        const right = document.createElement('div');
        right.className = 'webcam-container';
        right.appendChild(localVideo);
        gameContainer.prepend(left);
        gameContainer.appendChild(right);
      }

      await webRTCManager.createPeerConnection();
    },
    onWebRTCOffer: async (offer) => {
      await webRTCManager.handleOffer(offer);
    },
    onWebRTCAnswer: async (answer) => {
      await webRTCManager.handleAnswer(answer);
    },
    onICECandidate: async (candidate) => {
      await webRTCManager.addIceCandidate(candidate);
    }
  };

  // Inizializza gli event listener UI
  initUIEventListeners(socket, uiCallbacks);

  // Inizializza gli handler socket.io
  initSocketHandlers(socket, gameState, socketCallbacks);

  // Mostra la schermata iniziale
  const homeScreen = document.getElementById('homeScreen');
  showScreen(homeScreen);
});