#!/usr/bin/env node
// Simple ASR WebSocket demo server.
// Reads lines from stdin and broadcasts { text: line } to connected clients.
// Use: node scripts/asr_ws_demo.js

const WebSocket = require('ws');
const readline = require('readline');

const wss = new WebSocket.Server({ port: 2700 });
console.log('ASR demo WS server listening on ws://localhost:2700');

wss.on('connection', (ws) => {
  console.log('client connected');
  ws.on('message', (msg) => {
    console.log('received from client:', msg.toString());
  });
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on('line', (line) => {
  const payload = JSON.stringify({ text: line });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
});
