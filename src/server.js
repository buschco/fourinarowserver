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

app.get('/info', (req, res) => {
  var message = "Ich hab zurzeit einfach Sau wenig Zeit 🙈. Die Farben beim timer werden immer noch braun. Jedoch sollten jetzt die Umrandungen bei den Spielern in der passenden Farbe sein 🤔"
  res.json({info: message})
})

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
    socket.on('newGame', (options)=> newGame(socket, options));
    socket.on('move', (data) => move(socket, data.gameId, data.pos))
    socket.on('ready', (gameId)=> setReady(socket.id,gameId));
    socket.on('join', (data)=> join(socket,data.id, data.name));
    socket.on('openGames', (options)=> getOpenGames(socket, options));
    socket.on('players', (gameId)=> updatePlayers(socket, gameId));
    socket.on('leaveGame', ()=> leaveGame(socket));
    socket.on('game',()=>game(socket))
})

function leaveGame(socket){
  g.removePlayer(socket.id,undefined,(gameId)=>{
    websocket.to(gameId).emit('timer', {time: 0, id: socket.id, isReady: false})
    socket.leave(gameId)
  })
}

function updatePlayers(socket, gameId) {
  websocket.to(gameId).emit('players', g.getPlayersInGame(gameId))
}

function move(socket, gameId, pos) {
  g.move(gameId, socket.id, pos, (index,won)=>{
    if(index>=0){
      var winner = (won==true ? socket.id : undefined)
      websocket.to(gameId).emit('move', {pos: pos, player: index+1, winner: winner})
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
  g.addPlayer(socket.id, gameId, name, (res,start) =>{
    if(res==false){
      socket.emit('join', false)
    } else {
      if(start==false){
        socket.join(gameId);
        socket.emit('join', {game: g.getGames()[gameId], socketId: socket.id})
      } else {
        socket.join(gameId);
        socket.emit('join', {game: g.getGames()[gameId], socketId: socket.id})
        var players = g.getPlayersInGame(gameId)
        websocket.to(gameId).emit('players', players)
        startTimer(gameId, players[0].id)
        startTimer(gameId, players[1].id)
      }
    }
  })
}

function startTimer(gameId, socketId) {
  g.setReady(socketId, gameId, false)
  //// TODO:
  let i=15
  var int = setInterval(()=> {
    websocket.to(gameId).emit('timer', {time: i, id: socketId, isReady: false})
    i--;
    if(g.getReady(socketId, gameId)==true){
      websocket.to(gameId).emit('timer', {time: 'ready', id: socketId, isReady: true})
      clearInterval(int)
      if(g.allReady(gameId) && g.getWinner(gameId)===''){
        startTimer(gameId, g.getNextId(gameId))
      }
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

// function allReady(gameId){
//   games[gameId].players.forEach((e) =>{
//       if(e.ready=false)
//         return false
//   })
//   return true
// }

// function move(pos, gameId, socket) {
//   if(games[gameId].players[socket.id]==undefined){
//     socket.emit('test', 'You are not part of this game')
//   }
//   if(games[gameId].players[socket.id].ready=false && isMoveValid(pos.row,pos.col,gameId)){
//     updateField(pos.row,pos.col,games[gameId].nextPlayer+1,gameId);
//     var winner = winCheck(pos, games[gameId].nextPlayer+1, gameId);
//     if(winner){
//       winner = games[gameId].nextPlayer+1
//     }
//     websocket.to(gameId).emit('move', {pos: pos, color: games[gameId].nextPlayer, winnder: winner});
//     games[gameId].nextPlayer=1-games[gameId].nextPlayer;
//   }
// }

// function startReadyTimer(gameId, player) {
//   let i=10
//   var int = setInterval(()=> {
//         websocket.to(gameId).emit('timer', ''+i);
//       i--;
//       if(games[gameId].players[player].ready){
//         websocket.to(gameId).emit('ready', player);
//         clearInterval(int)
//       }
//       if(i<0){
//         socket.emit('ready', false)
//         clearInterval(int)
//         kickPlayer(socket.id)
//       }
//   }, 5000);
// }


// {
// function nextPlayer(gameId) {
//   if(games[gameId].live!=true){
//     let p =[]
//     games[gameId].players.forEach((e) =>{
//       p.push(e.id)
//     })
//     games[gameId].live=true
//     if(Math.random()>0.5){
//       startTimer(gameId, p[1])
//     } else {
//       startTimer(gameId, p[0])
//     }
//   }
//   else {
//     let prevPlayer=undefined
//     games[gameId].players.forEach((e) =>{
//       if (e.ready==false) {
//         games[gameId].players[e.id].ready=true
//       }
//       else {
//         startTimer(gameId, e.id)
//       }
//     })
//   }
// }
//   // function startTimer2(gameId, socket) {
//   //   let i=10
//   //   let oldPlayer = games[gameId].nextPlayer
//   //   var int = setInterval(()=> {
//   //       websocket.to(gameId).emit('timer', ''+i);
//   //       i--;
//   //       if(games[gameId].nextPlayer==1-oldPlayer){
//   //         websocket.to(gameId).emit('timer', 'good end')
//   //         clearInterval(int)
//   //       }
//   //       if(i<0){
//   //         websocket.to(gameId).emit('timer', 'bad end')
//   //         clearInterval(int)
//   //       }
//   //   }, 1000);
//   // }
//
//   // function createGame(options, socket) {
//   //   var gameId = uuidv1()
//   //   var game = {
//   //     id: gameId,
//   //     owner: socket.id,
//   //     players: [{id: socket.id, ready: false}],
//   //     options: options,
//   //     nextPlayer: undefined,
//   //     field: createField(options.h,options.w)
//   //   };
//   //   games[gameId]=game;
//   //   joinRoom(gameId,socket);
//   // }
//
//   // function createField(h,w){
//   //   var newField = new Array(h)
//   //   for (var i = 0; i < h; i++) {
//   //     newField[i] = new Array(w)
//   //     for (var j = 0; j < w; j++) {
//   //       newField[i][j] = 0; //0 nothing; 1 player1; 2 player2
//   //     }
//   //   }
//   //   return newField;
//   // }
//   //
//   // function isPlayersTurn(id, gameId){
//   //   return games[gameId].players[games[gameId].nextPlayer]==id
//   // }
//
//   // function updateField(x,y,player,gameId){
//   //   games[gameId].field[x][y]=player;
//   // }
//
//   // function isMoveValid(x,y,gameId){
//   //   if(games[gameId].field[x][y]>0){
//   //     return false
//   //   }
//   //   if (x == games[gameId].options.h-1) {
//   //     return true
//   //   }
//   //   else if (games[gameId].field[x+1][y]>0) {
//   //     return true
//   //   }
//   //   return false
//   // }
//   //
//   // function onUserJoined(userId, socket) {
//   //   // try {
//   //   //   // The userId is null for new users.
//   //   //   if (!userId) {
//   //   //     var user = db.collection('users').insert({}, (err, user) => {
//   //   //       socket.emit('userJoined', user._id);
//   //   //       users[socket.id] = user._id;
//   //   //       _sendExistingMessages(socket);
//   //   //     });
//   //   //   } else {
//   //   users[socket.id] = userId;
//   //   //   }
//   //   // } catch(err) {
//   //   //   console.err(err);
//   //   // }
//   // }
//
//   //
//   // if(games[gameId].nextPlayer==undefined){
//   //   if(Math.random()>0.5){
//   //     games[gameId].nextPlayer=0
//   //     games[gameId].players[0].ready = false
//   //     //websocket.to(gameId).emit('yourTurn', games[gameId].players[0].id)
//   //     startTimer(gameId, 0)
//   //   } else {
//   //     games[gameId].nextPlayer=1
//   //     games[gameId].players[1].ready = false
//   //     //websocket.to(gameId).emit('yourTurn', games[gameId].players[1].id)
//   //     startTimer(gameId, 1)
//   //   }
//   // }
//
//   // function getColor(gameId, socket) {
//   //   if(games[gameId].nextPlayer==undefined){
//   //     if(Math.random()>0.5){
//   //       games[gameId].nextPlayer=0
//   //       games[gameId].players[1]={id: socket.id, ready: true}
//   //       socket.emit('yourColor', 1-games[gameId].nextPlayer)
//   //     } else {
//   //       games[gameId].nextPlayer=1
//   //       games[gameId].players[0]={id: socket.id, ready: true}
//   //       socket.emit('yourColor', 1-games[gameId].nextPlayer)
//   //     }
//   //   }else {
//   //     games[gameId].players[games[gameId].nextPlayer]=socket.id
//   //     socket.emit('yourColor', games[gameId].nextPlayer)
//   //     games[gameId].nextPlayer=0
//   //     websocket.to(gameId).emit('letsgo', true);
//   //   }
//   // }
//
//   // function joinRoom(socket,gameId) {
//   //   if(games[gameId].in==0){ //Komplett leer
//   //     socket.join(gameId);
//   //     socket.emit('yourGame', {gameId: gameId, options: games[gameId].options});
//   //     games[gameId].players[socket.id]={id: socket.id, ready: false}
//   //   }
//   //   if(games[gameId].in==1){  //nur 1 drinn leer
//   //     socket.join(gameId);
//   //     socket.emit('yourGame', {gameId: gameId, options: games[gameId].options});
//   //     games[gameId].players[socket.id]={id: socket.id, ready: false}
//   //     games[gameId].in+=1
//   //
//   //   }
//   //   else { //voll
//   //     socket.emit('gameFull', false);
//   //   }
//   // }
// }
