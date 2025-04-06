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
const int MAX_SCORE = 5;           // Punteggio massimo per vincere
const int PADDLE_SPEED = 7;        // Velocità di movimento continuo della racchetta
const int BALL_SPEED_INCREMENT = 1; // Incremento di velocità ad ogni colpo

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

// Variabili per il movimento continuo (host e client)
bool leftUpPressed = false;
bool leftDownPressed = false;
bool clientUpPressed = false;
bool clientDownPressed = false;

// Funzioni EM_JS per il rendering sul canvas HTML
EM_JS(void, clearCanvas, (), {
  const canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

EM_JS(void, drawRect, (int x, int y, int w, int h, const char* color), {
  const canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = UTF8ToString(color);
  ctx.fillRect(x, y, w, h);
});

EM_JS(void, drawText, (const char* text, int x, int y), {
  const canvas = document.getElementById('pongCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.font = '30px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText(UTF8ToString(text), x, y);
});

// Resetta la pallina dopo che un giocatore ha segnato
void resetBall(bool leftScored) {
    ballX = (WIDTH - BALL_SIZE) / 2;
    ballY = (HEIGHT - BALL_SIZE) / 2;
    ballDX = leftScored ? 4 : -4;
    ballDY = (rand() % 7) - 3;
    if (ballDY == 0) ballDY = 1;
}

// Disegna lo stato attuale del gioco sul canvas
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

// Controlla se è stato raggiunto il punteggio massimo e notifica il vincitore
void checkGameOver() {
    if (scoreLeft >= MAX_SCORE || scoreRight >= MAX_SCORE) {
        std::string winner = (scoreLeft >= MAX_SCORE) ? "Hai vinto!" : "Hai perso!";
        
        // Mostra l'overlay con il messaggio del vincitore
        EM_ASM({
            if (typeof showWinner === 'function') {
                showWinner(UTF8ToString($0));
            }
        }, (winner).c_str());
        
        // Se sono l'host, invio il messaggio anche al client e interrompo il loop
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

// Funzione di aggiornamento principale (usata dall'host)
void update() {
    // Aggiorna il movimento continuo della racchetta sinistra (host)
    if (leftUpPressed) {
        leftPaddleY -= PADDLE_SPEED;
        if (leftPaddleY < 0) leftPaddleY = 0;
    }
    if (leftDownPressed) {
        leftPaddleY += PADDLE_SPEED;
        if (leftPaddleY + PADDLE_HEIGHT > HEIGHT)
            leftPaddleY = HEIGHT - PADDLE_HEIGHT;
    }
    
    // Aggiorna la posizione della pallina
    ballX += ballDX;
    ballY += ballDY;
    
    // Gestione del rimbalzo verticale
    if (ballY <= 0 || ballY + BALL_SIZE >= HEIGHT) {
        ballDY = -ballDY;
    }
    
    // Gestione collisione con la racchetta sinistra
    if (ballX <= PADDLE_WIDTH) {
        if (ballY + BALL_SIZE/2 >= leftPaddleY && ballY + BALL_SIZE/2 <= leftPaddleY + PADDLE_HEIGHT) {
            ballDX = -ballDX;
            // Incrementa la velocità della pallina
            ballDX += (ballDX > 0 ? BALL_SPEED_INCREMENT : -BALL_SPEED_INCREMENT);
            ballDY += (ballDY > 0 ? BALL_SPEED_INCREMENT : -BALL_SPEED_INCREMENT);
        } else {
            scoreRight++;
            resetBall(false);
        }
    }
    
    // Gestione collisione con la racchetta destra
    if (ballX + BALL_SIZE >= WIDTH - PADDLE_WIDTH) {
        if (ballY + BALL_SIZE/2 >= rightPaddleY && ballY + BALL_SIZE/2 <= rightPaddleY + PADDLE_HEIGHT) {
            ballDX = -ballDX;
            // Incrementa la velocità della pallina
            ballDX += (ballDX > 0 ? BALL_SPEED_INCREMENT : -BALL_SPEED_INCREMENT);
            ballDY += (ballDY > 0 ? BALL_SPEED_INCREMENT : -BALL_SPEED_INCREMENT);
        } else {
            scoreLeft++;
            resetBall(true);
        }
    }
    
    drawGame();
    checkGameOver();
    
    // Invia lo stato di gioco aggiornato al client
    EM_ASM_({
        if (typeof sendGameState === 'function') {
            sendGameState($0, $1, $2, $3, $4, $5);
        }
    }, ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight);
}

// Funzione per aggiornare l'input del client: invia comandi in base allo stato dei tasti
void update_client_input() {
    if (clientUpPressed) {
        EM_ASM({
            if (typeof sendPaddleInput === 'function') {
                sendPaddleInput('up');
            }
        });
    }
    if (clientDownPressed) {
        EM_ASM({
            if (typeof sendPaddleInput === 'function') {
                sendPaddleInput('down');
            }
        });
    }
}

// Aggiorna lo stato di gioco in base ai dati ricevuti dal host (chiamata dal JS)
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

// Aggiorna la posizione della racchetta remota (riceve input dal client)
extern "C" EMSCRIPTEN_KEEPALIVE
void set_remote_paddle(int y) {
    rightPaddleY = y;
}

// Restituisce la posizione attuale della racchetta remota
extern "C" EMSCRIPTEN_KEEPALIVE
int get_remote_paddle() {
    return rightPaddleY;
}

// Callback per la gestione del keydown (pressione tasto)
EM_BOOL key_callback(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    // Per l'host si aggiornano le variabili di movimento direttamente
    if (isHost) {
        if (strcmp(e->key, "w") == 0 || strcmp(e->key, "ArrowUp") == 0) {
            leftUpPressed = true;
        } else if (strcmp(e->key, "s") == 0 || strcmp(e->key, "ArrowDown") == 0) {
            leftDownPressed = true;
        }
    } else { // Per il client, si aggiornano le variabili da usare per inviare l'input
        if (strcmp(e->key, "w") == 0 || strcmp(e->key, "ArrowUp") == 0) {
            clientUpPressed = true;
        } else if (strcmp(e->key, "s") == 0 || strcmp(e->key, "ArrowDown") == 0) {
            clientDownPressed = true;
        }
    }
    return EM_TRUE;
}

// Callback per la gestione del keyup (rilascio tasto)
EM_BOOL keyup_callback(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    if (isHost) {
        if (strcmp(e->key, "w") == 0 || strcmp(e->key, "ArrowUp") == 0) {
            leftUpPressed = false;
        } else if (strcmp(e->key, "s") == 0 || strcmp(e->key, "ArrowDown") == 0) {
            leftDownPressed = false;
        }
    } else {
        if (strcmp(e->key, "w") == 0 || strcmp(e->key, "ArrowUp") == 0) {
            clientUpPressed = false;
        } else if (strcmp(e->key, "s") == 0 || strcmp(e->key, "ArrowDown") == 0) {
            clientDownPressed = false;
        }
    }
    return EM_TRUE;
}

// Imposta il ruolo (1 = host, 0 = client)
extern "C" EMSCRIPTEN_KEEPALIVE
void set_role(int role) {
    isHost = (role == 1);
}

// Funzione di avvio del gioco, chiamata da app.js
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void start_game() {
        emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, EM_TRUE, key_callback);
        emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, EM_TRUE, keyup_callback);
        if (isHost) {
            emscripten_set_main_loop(update, 0, 1);
        } else {
            emscripten_set_main_loop(update_client_input, 0, 1);
        }
    }
}