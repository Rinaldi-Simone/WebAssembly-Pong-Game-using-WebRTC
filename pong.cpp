// pong.cpp

#include <emscripten.h>
#include <emscripten/html5.h>
#include <string>
#include <cstring>
#include <cstdlib>

// Costanti di gioco
const int WIDTH = 800;
const int HEIGHT = 600;
const int PADDLE_WIDTH = 10;
const int PADDLE_HEIGHT = 100;
const int BALL_SIZE = 10;
const int MAX_SCORE = 5; // Punteggio massimo per vincere

// Stato del gioco
int leftPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
int rightPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
int ballX = (WIDTH - BALL_SIZE) / 2;
int ballY = (HEIGHT - BALL_SIZE) / 2;
int ballDX = 4;
int ballDY = 2;
int scoreLeft = 0;
int scoreRight = 0;

bool isHost = false; // Se true, questo client esegue la simulazione (host); altrimenti è client

// Funzioni EM_JS per il rendering sul canvas HTML
EM_JS(void, clearCanvas, (), {
  var canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

EM_JS(void, drawRect, (int x, int y, int w, int h, const char* color), {
  var canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = UTF8ToString(color);
  ctx.fillRect(x, y, w, h);
});

EM_JS(void, drawText, (const char* text, int x, int y), {
  var canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.font = '30px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText(UTF8ToString(text), x, y);
});

// Funzione per resettare la pallina dopo che un giocatore ha segnato
void resetBall(bool leftScored) {
    ballX = (WIDTH - BALL_SIZE) / 2;
    ballY = (HEIGHT - BALL_SIZE) / 2;
    ballDX = leftScored ? 4 : -4;
    ballDY = (rand() % 7) - 3;
    if (ballDY == 0) ballDY = 1;
}

// Funzione per disegnare lo stato attuale del gioco
void drawGame() {
    clearCanvas();
    drawRect(ballX, ballY, BALL_SIZE, BALL_SIZE, "#000000");
    drawRect(0, leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "#000000");
    drawRect(WIDTH - PADDLE_WIDTH, rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, "#000000");
    
    std::string scoreL = std::to_string(scoreLeft);
    std::string scoreR = std::to_string(scoreRight);
    drawText(scoreL.c_str(), WIDTH / 4, 50);
    drawText(scoreR.c_str(), (WIDTH * 3) / 4, 50);
}

// Funzione per annunciare il vincitore e fermare il gioco
void checkGameOver() {
    if (scoreLeft >= MAX_SCORE || scoreRight >= MAX_SCORE) {
        std::string winner = (scoreLeft >= MAX_SCORE) ? "Hai vinto!" : "Hai perso!";
        
        // Mostra l'overlay localmente
        EM_ASM({
            if (typeof showWinner === 'function') {
                showWinner(UTF8ToString($0));
            }
        }, (winner).c_str());
        
        // Corretto: prima crea una std::string
        if (isHost) {
            std::string clientMessage = (scoreLeft >= MAX_SCORE) ? "Hai perso!" : "Hai vinto!";
            EM_ASM({
                if (typeof sendGameOver === 'function') {
                    sendGameOver(UTF8ToString($0));
                }
            }, clientMessage.c_str());
            
            emscripten_cancel_main_loop();
        }
    }
}

// Funzione di aggiornamento (solo per host)
void update() {
    ballX += ballDX;
    ballY += ballDY;
    
    if (ballY <= 0 || ballY + BALL_SIZE >= HEIGHT) {
        ballDY = -ballDY;
    }
    
    if (ballX <= PADDLE_WIDTH) {
        if (ballY + BALL_SIZE/2 >= leftPaddleY && ballY + BALL_SIZE/2 <= leftPaddleY + PADDLE_HEIGHT) {
            ballDX = -ballDX;
        } else {
            scoreRight++;
            resetBall(false);
        }
    }
    
    if (ballX + BALL_SIZE >= WIDTH - PADDLE_WIDTH) {
        if (ballY + BALL_SIZE/2 >= rightPaddleY && ballY + BALL_SIZE/2 <= rightPaddleY + PADDLE_HEIGHT) {
            ballDX = -ballDX;
        } else {
            scoreLeft++;
            resetBall(true);
        }
    }
    
    drawGame();
    checkGameOver();
    
    // Invia lo stato di gioco al client tramite la funzione JS sendGameState
    EM_ASM_({
        if (typeof sendGameState === 'function') {
            sendGameState($0, $1, $2, $3, $4, $5);
        }
    }, ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight);
}

// Funzione esportata per il client: aggiorna lo stato ricevuto dal host e ridisegna
extern "C" EMSCRIPTEN_KEEPALIVE
void update_remote_state(int bx, int by, int lp, int rp, int sl, int sr) {
    ballX = bx;
    ballY = by;
    leftPaddleY = lp;
    rightPaddleY = rp;
    scoreLeft = sl;
    scoreRight = sr;
    drawGame();
}

// Aggiorna la posizione della racchetta remota (usata dal host per applicare l'input ricevuto dal client)
extern "C" EMSCRIPTEN_KEEPALIVE
void set_remote_paddle(int y) {
    rightPaddleY = y;
}

// Legge la posizione corrente della racchetta remota
extern "C" EMSCRIPTEN_KEEPALIVE
int get_remote_paddle() {
    return rightPaddleY;
}

// Callback per la gestione degli input da tastiera
EM_BOOL key_callback(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    if (isHost) {
        if (strcmp(e->key, "w") == 0) {
            leftPaddleY -= 20;
            if (leftPaddleY < 0) leftPaddleY = 0;
        } else if (strcmp(e->key, "s") == 0) {
            leftPaddleY += 20;
            if (leftPaddleY + PADDLE_HEIGHT > HEIGHT) leftPaddleY = HEIGHT - PADDLE_HEIGHT;
        }
    } else {
        if (strcmp(e->key, "w") == 0) {
            EM_ASM({
                if (typeof sendPaddleInput === 'function') {
                    sendPaddleInput('up');
                }
            });
        } else if (strcmp(e->key, "s") == 0) {
            EM_ASM({
                if (typeof sendPaddleInput === 'function') {
                    sendPaddleInput('down');
                }
            });
        }
    }
    return EM_TRUE;
}

// Imposta il ruolo (1 = host, 0 = client)
extern "C" EMSCRIPTEN_KEEPALIVE
void set_role(int role) {
    isHost = (role == 1);
}

// Funzione esportata per avviare il gioco, chiamata da app.js
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void start_game() {
        emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, EM_TRUE, key_callback);
        if (isHost) {
            emscripten_set_main_loop(update, 0, 1);
        }
    }
}