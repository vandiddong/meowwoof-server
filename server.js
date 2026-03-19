const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 전 세계 랭킹 데이터 (서버가 켜져있는 동안 유지됨)
let globalRanks = [
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 }
];
io.on('connection', (socket) => {
    console.log('플레이어 접속:', socket.id);

    // 1. 접속하면 현재 랭킹을 바로 보내줌
    socket.emit('update_ranks', globalRanks);

    // 2. 플레이어가 죽었을 때 레벨 기록을 받음
    socket.on('submit_score', (data) => {
        console.log('새 기록 도착:', data);
        globalRanks.push({ name: data.name, level: data.level });
        
        // 레벨 높은 순으로 정렬 후 상위 5명만 커트
        globalRanks.sort((a, b) => b.level - a.level);
        globalRanks = globalRanks.slice(0, 5);

        // 접속 중인 모든 사람에게 업데이트된 랭킹 전송
        io.emit('update_ranks', globalRanks);
    });

    socket.on('disconnect', () => console.log('플레이어 나감'));
});

const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`서버가 성공적으로 가동되었습니다! 포트: ${PORT}`);
});
