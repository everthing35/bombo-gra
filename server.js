const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    // Tworzenie pokoju przez hosta
    socket.on('createRoom', ({ roomCode, nickname }) => {
        if (rooms[roomCode]) {
            socket.emit('errorMsg', 'Taki pokój już istnieje!');
            return;
        }
        
        rooms[roomCode] = {
            players: [{ id: socket.id, name: nickname, lives: 3 }],
            status: 'lobby',
            currentPlayerIndex: 0
        };

        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    });

    // Dołączanie do istniejącego pokoju
    socket.on('joinRoom', ({ roomCode, nickname }) => {
        let room = rooms[roomCode];
        if (!room) {
            socket.emit('errorMsg', 'Nie znaleziono pokoju o takim ID!');
            return;
        }
        if (room.status !== 'lobby') {
            socket.emit('errorMsg', 'Gra już się rozpoczęła!');
            return;
        }
        if (room.players.length >= 5) {
            socket.emit('errorMsg', 'Pokój jest pełny (maks. 5 osób)!');
            return;
        }

        room.players.push({ id: socket.id, name: nickname, lives: 3 });
        socket.join(roomCode);

        io.to(roomCode).emit('updatePlayers', room.players);
    });

    socket.on('disconnect', () => {
        // Usuwanie gracza z pokoi przy rozłączeniu
        for (let code in rooms) {
            let room = rooms[code];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[code];
            } else {
                io.to(code).emit('updatePlayers', room.players);
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Serwer działa na porcie 3000');
});
```[cite: 2]

---

### 2. `index.html`

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Wybuchowa Bomba - Lobby</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { background: #1a1a1a; color: white; font-family: sans-serif; text-align: center; padding: 20px; }
        .box { background: #2a2a2a; padding: 20px; border-radius: 10px; max-width: 400px; margin: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        input { padding: 10px; margin: 10px; font-size: 16px; width: 80%; border-radius: 5px; border: none; }
        button { padding: 10px 20px; font-size: 16px; background: #2ed573; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #26af5f; }
        .btn-create { background: #ffa502; }
        .player { padding: 8px; margin: 5px; background: #333; border-radius: 5px; }
        .error { color: #ff4757; font-weight: bold; }
    </style>
</head>
<body>
    <h1>💣 Wybuchowa Bomba</h1>

    <!-- EKRAN STARTOWY -->
    <div id="login-screen" class="box">
        <p>Wpisz swój nick:</p>
        <input id="nick" placeholder="Twój Nick" maxlength="12"><br>
        <button class="btn-create" onclick="createRoom()">STÓRZ LOBBY</button>
        <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
        <p>Lub dołącz do istniejącego:</p>
        <input id="roomInput" placeholder="5-cyfrowe ID Lobby" maxlength="5"><br>
        <button onclick="joinRoom()">DOŁĄCZ DO LOBBY</button>
        <p id="error-msg" class="error"></p>
    </div>

    <!-- EKRAN LOBBY -->
    <div id="lobby-screen" class="box" style="display:none;">
        <h2>ID Twojego Lobby: <span id="display-room-id" style="color: #ffa502;">-----</span></h2>
        <p>Osoby w lobby (maks. 5):</p>
        <div id="playerList">Czekanie na graczy...</div>
    </div>

    <script>
        const socket = io();

        function createRoom() {
            const nickname = document.getElementById('nick').value.trim();
            if (!nickname) {
                document.getElementById('error-msg').textContent = "Wpisz nick!";
                return;
            }
            // Generowanie losowego 5-cyfrowego ID
            const roomCode = Math.floor(10000 + Math.random() * 90000).toString();
            socket.emit('createRoom', { roomCode, nickname });
        }

        function joinRoom() {
            const nickname = document.getElementById('nick').value.trim();
            const roomCode = document.getElementById('roomInput').value.trim();
            if (!nickname) {
                document.getElementById('error-msg').textContent = "Wpisz nick!";
                return;
            }
            if (roomCode.length !== 5) {
                document.getElementById('error-msg').textContent = "ID lobby musi mieć 5 cyfr!";
                return;
            }
            socket.emit('joinRoom', { roomCode, nickname });
        }

        socket.on('roomCreated', (roomCode) => {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('lobby-screen').style.display = 'block';
            document.getElementById('display-room-id').textContent = roomCode;
        });

        socket.on('updatePlayers', (players) => {
            // Jeśli dołączono pomyślnie, przełącz ekran na lobby
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('lobby-screen').style.display = 'block';

            const list = document.getElementById('playerList');
            list.innerHTML = players.map((p, index) => `
                <div class="player">
                    👤 ${p.name} ${index === 0 ? '(Host)' : ''}
                </div>
            `).join('');
        });

        socket.on('errorMsg', (msg) => {
            document.getElementById('error-msg').textContent = msg;
        });
    </script>
</body>
</html>
