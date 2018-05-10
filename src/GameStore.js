"use strict";
var games = []
var uuidv1 = require('uuid/v1')

const f = require('./VirtualField.js')

exports.createGame = function(options, bet, cb) {
  var gameId = uuidv1()
  var game = {
    id: gameId,
    players: [],
    options: options,
    next: -1,
    winner: '',
    bet: bet,
    status: 0 //0=not ingame; 1=ingame
  }
  games[gameId]=game
  cb(gameId)
}

exports.getOptions = function (gameId) {
  return games[gameId].options
};

exports.addPlayer = function(socketId, gameId, name, cb) {
  if(socketId == undefined || games[gameId]==undefined || cb == undefined){
    return
  }
  if(games[gameId].players.length>=2){ //full
    cb(false,false)
  } else {
    games[gameId].players.push({
      id: socketId,
      ready: false,
      name: name,
      wincount: 0
    })
    if(games[gameId].players.length==2){ //einer

      cb(true,true)
    } else {
      cb(true,false) //leer
    }
  }
}

exports.removePlayer = function(socketId, gameId, cb) {
  if(gameId==undefined){
    gameId=getGameId(socketId)
  }
  var index=getIndexOfPlayer(socketId,gameId)
  if (index>=0) {
    games[gameId].players.splice(index, 1)
    if(games[gameId].players.length==0){
      delete games[gameId]
    }
    cb(gameId)
  }
  else {

  }
}

exports.setReady = function (socketId, gameId, ready) {
  var index=getIndexOfPlayer(socketId,gameId)
  if (index>=0) {
    games[gameId].players[index].ready=ready
    return true
  }
  else {
    return false
  }
}

exports.getReady = function(socketId, gameId) {
  var index=getIndexOfPlayer(socketId, gameId)
  if (index>=0) {
    return games[gameId].players[index].ready
  }
}

exports.getNextId = function(gameId) {
  if(games[gameId].next==-1){
    if(Math.random()>0.5){
      setNext(gameId,1)
    } else {
      setNext(gameId,0)
    }
  }
  return games[gameId].players[games[gameId].next].id
}

exports.getWinner = function(gameId) {
  return games[gameId].winner
}

exports.move = function(gameId, socketId, pos, cb) {
  if (isPlayersTurn(gameId, socketId)) {
    f.updateField(gameId,pos,games[gameId].next,(valid,winline)=>{
      if(valid==false){
        cb(-1)
      } else {
        switchNext(gameId)
        cb(getIndexOfPlayer(socketId, gameId),winline)
      }
    })
  } else {
    cb(-1)
  }
}

exports.getPlayersInGame = function (gameId) {
  if(games[gameId]==undefined){
    return
  }else {
    return games[gameId].players
  }
}

exports.allReady = function(gameId) {
  for (var i = 0; i < games[gameId].players.length; i++) {
    if(games[gameId].players[i].ready==false){
      return false
    }
  }
  return true
};

exports.getGames = function() {
  return games
};

exports.checkOpenGames = function() { //true if empty
  for(var i in games) {
      if(games.hasOwnProperty(i))
          return false;
  }
  return JSON.stringify(games) === JSON.stringify({});
}

exports.getGame = function(id) {
  return games[id]
}

exports.filterGames = function(size, bet) {
  let out = []
  let w = size.w
  let h = size.h
  for (var i in games) {
    if(games[i].options!=undefined){
      if (games[i].options.w == w && games[i].options.h==h &&
        games[i].players.length<=1 &&
        games[i].bet==bet
      ) {
        out.push(games[i])
      }
    }
  }
  return out
}

exports.getOtherPlayerId = function(gameId,socketId) {
  var players = games[gameId].players
  for (var i = 0; i < players.length; i++) {
    if (players[i].id!==socketId) {
      return players[i]
    }
  }
}

exports.resetGame= function(gameId) {
  f.createField(gameId,games[gameId].options.h,games[gameId].options.w)
  games[gameId].next=-1
}

exports.setStatus = function(gameId,status){
  if(games[gameId]!=undefined){
    games[gameId].status=status
  }
}

exports.getStatus = function(gameId){
  return games[gameId].status
}

function getGameId(socketId) {
  for (var key in games) {
    if (games.hasOwnProperty(key) && getIndexOfPlayer(socketId,games[key].id)>=0) {
      return games[key].id
    }
  }
  return undefined
}

function isPlayersTurn(gameId, socketId) {
  var index = getIndexOfPlayer(socketId, gameId)
  if (index>-1) {
    if(games[gameId].next==index){
      return true
    }
  }
  return false
}

function getIndexOfPlayer(socketId, gameId) {
  if(socketId==undefined || gameId==undefined || games[gameId]==undefined || games[gameId].players == undefined){
    return -1
  }
  for (var i = 0; i < games[gameId].players.length; i++) {
    if(games[gameId].players[i].id===socketId){
      return i
    }
  }
  return -1
}

function switchNext(gameId) {
  if (games[gameId].next==-1) {
    return false
  } else {
    games[gameId].players[games[gameId].next].ready=true
    games[gameId].next=1-games[gameId].next
    games[gameId].players[games[gameId].next].ready=true
  }
}

function setNext(gameId, next) {
  games[gameId].next=next
};

function deleteGame(gameId) {
  delete games[gameId]
}
