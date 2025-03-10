// game.js - Funzioni specifiche del gioco

// Inizializza le funzioni globali per il gioco
function initGameFunctions(webRTCManager) {
  // Funzione per inviare lo stato del gioco
  window.sendGameState = function(
      ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight) {
    webRTCManager.sendGameState(
        ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight);
  };

  // Funzione per inviare notifica di fine partita
  window.sendGameOver = function(message) {
    webRTCManager.sendGameOver(message);
  };

  // Funzione per mostrare il vincitore
  window.showWinner = function(message) {
    const winnerOverlay = document.getElementById('winnerOverlay');
    const winnerMessage = document.getElementById('winnerMessage');
    winnerMessage.textContent = message;
    winnerOverlay.style.display = 'flex';
  };
}

export {initGameFunctions};