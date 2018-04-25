"use strict";
var fields = []

exports.createField = function (gameId, h, w) {
  var newField = new Array(h)
  for (var i = 0; i < h; i++) {
    newField[i] = new Array(w)
    for (var j = 0; j < w; j++) {
      newField[i][j] = 0; //0 nothing; 1 player1; 2 player2
    }
  }
  fields[gameId]=newField
}

exports.updateField = function(gameId,pos,value,cb) {
  if(isMoveValid(gameId,pos.x,pos.y)){
    fields[gameId][pos.x][pos.y]=value+1
    cb(true,winCheck(pos,value+1,gameId))
  }else {
    cb(false,false)
  }
}

function isMoveValid (gameId,x,y) {
  let x1 = parseInt(x)+1
  if(y<0 || x<0 || x>fields[gameId].length || y>fields[gameId][x].length){
    return false //outofbounds
  }
  if(fields[gameId][x][y]>0){
    return false //already taken
  }
  if (x == fields[gameId].length-1) {
    return true //bottom is ok
  }
  else if (fields[gameId][x1][y]>0) {
    return true //spot below is ok
  }
  return false
}

function winCheck(pos, player, gameId) {
  var right = getDiagStart(pos, 1,gameId) //rechts
  var left = getDiagStart(pos, -1,gameId) //links
  var arraysToCheck = []
  arraysToCheck.push(createLine(right, -1,gameId))
  arraysToCheck.push(createLine(left, 1,gameId))
  arraysToCheck.push(fields[gameId][pos.x])
  arraysToCheck.push(createCol(pos,gameId))
  for (var i = 0; i < arraysToCheck.length; i++) {
    if (arrayFourCheck(arraysToCheck[i],player)) {
      return true
    }
  }
  return false
}

function getDiagStart(pos, dir, gameId) {
  let height = parseInt(fields[gameId].length-1)
  let width = parseInt(fields[gameId][0].length-1)
  let i = parseInt(0)
  dir = parseInt(dir)
  let x = parseInt(pos.x)
  let y = parseInt(pos.y)
  console.log(x+i<height-1, y+(i*dir)<width-1 , x+(i*dir)>0);

  while (y+i<height-1 && x+(i*dir)<width-1 && x+(i*dir)>0) {
    i++
  }
  // while (pos.y-i<fields[gameId].length-1 &&
  //   pos.x+(i*dir)<fields[gameId][i].length-1 &&
  //   pos.x+(i*dir)>0) {
  //   i++
  // }
  return {x: x+i, y: y+(i*dir)}
}

function createCol(pos, gameId) {
  line= []
  for (var i = 0; i < fields[gameId].length; i++) {
    line.push(fields[gameId][i][pos.y])
  }
  return line
}

function createLine(pos, dir, gameId) {
  let i = 0
  let height = parseInt(fields[gameId].length-1)
  let width = parseInt(fields[gameId][0].length-1)
  let x = parseInt(pos.x)
  let y = parseInt(pos.y)
  line= []
  while (y+(i*dir)>=0 && y+(i*dir)<width && x-i>0) {
    line.push(fields[gameId][x-i][y+(i*dir)])
    i++
  }
  return line
}

function arrayFourCheck(array,player) {
  if (array.length<4) {
    return false
  }
  j = 0
  for (var i = 0; i < array.length; i++) {
    if (array[i]==player) {
      j++
      if (j==4) {
        return true
      }
    } else {
      j=0
    }
  }
  return false
}
