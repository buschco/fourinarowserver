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

var clients = []
const g = require('./GameStore.js')

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
  var betrange = 100
  res.json({games: g.getGames({size: size, bet: calcBet(req.query.bet)},betrange)})
})

app.post('/game', (req, res) => {
  var size = SIZES[req.body.size]==undefined ? SIZES[0] : SIZES[req.body.size]
  res.json({gameId: g.createGame({size: size, bet: calcBet(req.body.bet)}), size: size})
})

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    // socket.on('login', ()=> login(socket));
    // socket.on('move', (data) => move(socket, data.gameId, data.pos))
    // socket.on('ready', (gameId)=> setReady(socket.id,gameId));
    socket.on('join', (data) => join(socket, data.id, data.name));
    // socket.on('openGames', (options)=> getOpenGames(socket, options));
    // socket.on('players', (gameId)=> updatePlayers(socket, gameId));
    // socket.on('leaveGame', ()=> leaveGame(socket));
    // socket.on('game',()=>game(socket))
})

/**
 * Join a game
 * @param {game_id} id of the game
 * @param {socket} socket of the player
 * @param {name} name of the player
 * @return {socket_response}
 */
function join(socket, id, name) {
  var playerCount = g.addPlayer(id, socket.id, name)
  if(playerCount<0) socket.emit('join', {game: undefined, message: 'Game is full or was removed'})
  else socket.emit('join', {game: g.getGame(id), id: socket.id})
  socket.join(id)
  if(playerCount==2){
    let players = g.getPlayers(id)
    let starter = g.getRandomPlayer(id)
    timer(players[1].id,id,15,starter)
    timer(players[0].id,id,15,starter)
  }
}


/**
 * This is very important
 * @param  {player_id} player_id
 * @param  {game_id} id        [description]
 * @param  {number} time seconds the player has time to react
 * @return {NOTHING} but works recursive
 */
function timer(player_id, id, time, next) {
  g.setReady(id, player_id, false)
  let i=time
  websocket.to(id).emit('timer', {time: i, id: player_id, isReady: false})
  var int = setInterval(()=> {
    i--
    websocket.to(id).emit('timer', {time: i, id: player_id, isReady: false})
    if(g.getReady(id, player_id)==true){
      clearInterval(int) //wenn in der console kein  JUHUU zu sehen ist muss diese zeile wie ein return behandlet werden: RUNTER!!
      websocket.to(id).emit('timer', {time: 'ready', id: player_id, isReady: true})
      console.log('JUHUU')
      if(g.getReadyOfAll(id)==true) {
        if(g.getStatus(id)==true){ //winnerflag ist gesetzt!!
          //determine random starter and start two timers
          //// TODO: winnersBall losersBall randomBall. aber da das eh im Gamestore abläuft ist soll das dort geschehen :)
          let newNext = getRandomPlayer(id)
          if(newNext!=undefined){
            var players = g.getPlayers(id)
            timer(players[1],id,15,newNext)
            timer(players[0],id,15,newNext)
            g.setStatus(id, false) //winnerflag zurücksetzten
          }
        } else {
          timer(next,id,time,player_id) //nein kein fehler. Immer swappen :)
        }
      }
    }
    if(i<0){
      clearInterval(int)
      clients[player_id].leave(player_id)
      websocket.to(id).emit('players', g.removePlayer(player_id, id))
    }
  }, 1000)
}

function calcBet(index) {
  var bet = 2
  for (var i = 0; i < index; i++) {
    bet=2*bet
  }
  return bet
}
