"use strict";
var express = require('express');
var https = require('https')
var socketio = require('socket.io');
var uuidv1 = require('uuid/v1');
var bodyParser = require('body-parser');
var fs = require('fs');
var path = require('path')

var app = express();
var options = {
  cert: fs.readFileSync(path.resolve('./cert/server.crt')),
  key: fs.readFileSync(path.resolve('./cert/server.key'))
}

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('static'));

var server = https.createServer(options, app)
var websocket = socketio(server);
server.listen(3000, () => console.log('listening on 3000'));

const SIZES = [
  {w: 8, h: 8},
  {w: 10, h: 10},
  {w: 14, h: 14},
]
//// TODO:
// - Error if player tries to join a non existing game

let clients = {};
let users = {};
let games = [];
let fields = [];

const g = require('./GameStore.js');
const c = require('./ClientStore');

app.get('/game', (req, res) => {
  var game = g.getGame(req.query.id)
  if(game==undefined){
    res.status(404)
    res.type('txt').send('Not found');
  }else {
    res.json(game)
  }
})

app.get('/games', (req, res) => {
  var size = SIZES[req.query.size]==undefined ? SIZES[0] : SIZES[req.query.size]
  var bet = calcBet(req.query.bet)
  res.json({games: g.filterGames(size,bet)})
})

app.post('/game', (req, res) => {
  var size = SIZES[req.body.size]==undefined ? SIZES[0] : SIZES[req.body.size]
  g.createGame(size, calcBet(req.body.bet), (id)=>{
    res.json({gameId: id, size: size})
  })
})

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    socket.on('login', ()=> login(socket));
    socket.on('move', (data) => move(socket, data.gameId, data.pos))
    socket.on('ready', (gameId)=> setReady(socket.id,gameId));
    socket.on('join', (data)=> join(socket,data.id, data.name));
    socket.on('openGames', (options)=> getOpenGames(socket, options));
    socket.on('players', (gameId)=> updatePlayers(socket, gameId));
    socket.on('leaveGame', ()=> leaveGame(socket));
    socket.on('game',()=>game(socket))
})

function join(socket, gameId, name){
  g.addPlayer(socket.id,gameId,name,(game)=>{
    socket.emit('join', {game: game, id: socket.id})
    if(game.players.length==2){
      //start timer
    }
  })
}

function leaveGame(socket){
  g.removePlayer(socket.id,undefined,(gameId)=>{
    websocket.to(gameId).emit('timer', {time: 0, id: socket.id, isReady: false})
    socket.leave(gameId)
  })
}

function updatePlayers(socket, gameId) {
  websocket.to(gameId).emit('players', g.getPlayersInGame(gameId))
}

function nextTimer(gameId, last){
  if(g.getPlayersInGame(gameId).length==2 && allReady()){

  }
  if(g.getStatus(gameId)==-1){
    g.setStatus(gameId,0)
    var players = g.getPlayersInGame(gameId)
    startTimer(gameId, players[0].id)
    startTimer(gameId, players[1].id)
  }
  if(g.getStatus(gameId)==1){
    startTimer(gameId, g.getNextId(gameId))
  } else if(g.getStatus(gameId)==0 && g.allReady(gameId)==true){
    websocket.to(gameId).emit('resetField',g.getSize(gameId))
    g.setStatus(gameId,1)
    startTimer(gameId, g.getNextId(gameId))
  }
}

function move(socket, gameId, pos) {
  g.move(gameId, socket.id, pos, (index,winline)=>{
    if(index>=0){
      if(winline!=undefined){
        g.resetGame(gameId)
        g.setStatus(gameId,-1)
      }
      var winner = (winline!=undefined ? socket.id : undefined)
      websocket.to(gameId).emit('move', {pos: pos, player: index+1, winner: winner, winline: winline})
    }
  })
}

function login(socket) {
  socket.emit('loggedId', socket.id);
}

function newGame(socket, options) {
  g.createGame(SIZES[options], socket.id, (gameId)=>{
    socket.emit('newGame', gameId);
  })
}

function join(socket, gameId, name) {
  g.addPlayer(socke.id, gameId, name, (count, err) => {
    if (err) {
      socket.emit('join', false)
    }
    socket.emit('join', {game: g.getGames()[gameId], socketId: socket.id})
    var players = g.getPlayersInGame(gameId)
    websocket.to(gameId).emit('players', players)
    if (count==2) {
      startTimer(gameId, players[0].id, nextTimer)
      startTimer(gameId, players[1].id, nextTimer)
    }
  })
  //readytimer
  // |
  // +-> wenn beide ready sind
  // |
  // +--> wmovetimer
}

function startTimer(gameId, socketId, cb) {
  g.setReady(socketId, gameId, false)
  //// TODO:
  let i=15
  websocket.to(gameId).emit('timer', {time: i, id: socketId, isReady: false})
  var int = setInterval(()=> {
    i--;
    websocket.to(gameId).emit('timer', {time: i, id: socketId, isReady: false})
    if(g.getReady(socketId, gameId)==true){
      clearInterval(int)
      websocket.to(gameId).emit('timer', {time: 'ready', id: socketId, isReady: true})
      cb(gameId,socketId)
    }
    if(i<0){
      clearInterval(int)
      g.removePlayer(socketId, gameId,(gameId)=>{
        websocket.to(gameId).emit('timer', {time: 0, id: socketId, isReady: false})
      })
      clients[socketId].leave(gameId)
    }
  }, 1000)
}

function getOpenGames(socket, options) {
  if(options == undefined || SIZES[options]==undefined || g.checkOpenGames()){
    // TODO: Error handling
    return
  }
  let games=g.getGames()
  let appli = []
  let w = SIZES[options].w
  let h = SIZES[options].h
  for (var i in games) {
    if(games[i].options!=undefined){
      if (games[i].options.w == w && games[i].options.h==h && games[i].players.length<=1) {
        appli.push(games[i])
      }
    }
  }
  socket.emit('openGames', appli)
}

function setReady(socketId,gameId) {
  g.setReady(socketId,gameId,true)
}

function game(socket) {
  socket.emit('game',g.getGame(socket.id))
}

function calcBet(index) {
  var bet = 2
  for (var i = 0; i < index; i++) {
    bet=2*bet
  }
  return bet
}
