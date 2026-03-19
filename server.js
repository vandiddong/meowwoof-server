const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const MAP_SIZE = 8000;

// --- 서버 결정 Map Data ---
let mapData = {
    stones: [],
    crates: [],
    bushes: []
};

// 맵 생성
function initMap() {
    for (let i = 0; i < 8; i++) mapData.stones.push({ x: Math.random() * (MAP_SIZE - 600) + 300, y: Math.random() * (MAP_SIZE - 600) + 300 });
    for (let i = 0; i < 20; i++) mapData.crates.push({ id: i, x: Math.random() * (MAP_SIZE - 400) + 200, y: Math.random() * (MAP_SIZE - 400) + 200, hp: 250 });
    for (let i = 0; i < 40; i++) mapData.bushes.push({ x: Math.random() * (MAP_SIZE - 400) + 200, y: Math.random() * (MAP_SIZE - 400) + 200 });
}
initMap();

// --- [v5.2] 서버 동기화 AI (봇 20마리) ---
let aiBots = [];
const BOT_COUNT = 20;

class Bot {
    constructor(id) {
        this.id = `BOT_${id}`;
        this.name = `AI_${Math.floor(Math.random() * 999)}`;
        this.x = Math.random() * (MAP_SIZE - 2000) + 1000;
        this.y = Math.random() * (MAP_SIZE - 2000) + 1000;
        this.type = Math.random() > 0.5 ? 'knight' : 'gunner';
        this.level = 1;
        this.moveAngle = Math.random() * Math.PI * 2;
        this.lastMoveChange = Date.now();
    }
    update() {
        // 기본 움직임 (3초마다 방향 바꿈)
        this.x += Math.cos(this.moveAngle) * 5;
        this.y += Math.sin(this.moveAngle) * 5;
        this.x = Math.max(50, Math.min(MAP_SIZE - 50, this.x));
        this.y = Math.max(50, Math.min(MAP_SIZE - 50, this.y));
        if(Date.now() - this.lastMoveChange > 3000) {
            this.moveAngle = Math.random() * Math.PI * 2;
            this.lastMoveChange = Date.now();
        }
    }
}
// 봇 초기화
for (let i = 0; i < BOT_COUNT; i++) aiBots.push(new Bot(i));

let players = {};
let globalRanks = [{ name: "King_Sangyeon", level: 1 }];

io.on('connection', (socket) => {
    socket.emit('init_world', mapData);

    socket.on('start_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data. nick || "Guest",
            type: data.type,
            x: Math.random() * 7000 + 500,
            y: Math.random() * 7000 + 500,
            level: data.level,
            hp: 100,
            aimAng: 0,
            isDashing: false
        };
        socket.emit('update_ranks', globalRanks);
    });

    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            Object.assign(players[socket.id], data);
        }
    });

    // 공격 신호 (각도/사거리 check)
    socket.on('attack', (attackData) => {
        const attacker = players[socket.id];
        if (!attacker) return;

        Object.values(players).forEach(target => {
            if (target.id === socket.id) return;
            const dist = Math.hypot(attacker.x - target.x, attacker.y - target.y);
            const range = attacker.type === 'knight' ? 300 : 850;
            // 각도 계산 (총알/근접 모두 서버가 사거리 check)
            if (dist < range) {
                target.hp -= (attacker.type === 'knight' ? 15 : 10);
                if (target.hp <= 0) {
                    target.hp = 0;
                    io.to(target.id).emit('you_died', { killer: attacker.name });
                }
            }
        });
    });

    socket.on('submit_score', (data) => {
        globalRanks.push({ name: data.name, level: data.level });
        globalRanks.sort((a, b) => b.level - a.level);
        globalRanks = globalRanks.slice(0, 5);
        io.emit('update_ranks', globalRanks);
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// 1초에 30번 관제 방송
setInterval(() => {
    // [v5.2] AI 봇 업데이트
    aiBots.forEach(b => b.update());
    io.emit('world_state', { players, aiBots });
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT);
