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
  if(isMoveValid(fields[gameId],pos)){
    fields[gameId][pos.y][pos.x]=value+1
    cb(true,winCheck(fields[gameId],pos,value+1))
  }else {
    cb(false,false)
  }
}

function isMoveValid (arr,pos) {
  var y1 = parseInt(pos.y)+1
  if(pos.y<0 || pos.x<0 || pos.y>arr.length || pos.x>arr[pos.y].length){
    return false //outofbounds
  }
  if(arr[pos.y][pos.x]>0){
    return false //already taken
  }
  if (pos.y == arr.length-1) {
    return true //bottom is ok
  }
  else if (arr[y1][pos.x]>0){
    return true //spot below is ok
  }
  return false
}

function winCheck(arr, pos, player) {
  var right = getDiagStart(arr,pos, 1) //rechts
  var left = getDiagStart(arr,pos, -1) //links
  var arraysToCheck = []
  arraysToCheck.push(createLine(arr,right, -1))
  arraysToCheck.push(createLine(arr,left, 1))
  arraysToCheck.push(arr[pos.y])
  arraysToCheck.push(createCol(arr, pos))
  for (var i = 0; i < arraysToCheck.length; i++) {
    if (arrayFourCheck(arraysToCheck[i],player)) {
      return true
    }
  }
  return false
}

function createCol(arr, pos) {
  var line= []
  for (var i = 0; i < arr.length; i++) {
    line.push(arr[i][pos.x])
  }
  return line
}

function getDiagStart(arr, pos, dir) {
  let i = 0
  while (arr.length-1>pos.y+i && arr[i].length-1>pos.x+(dir*i) && pos.x+(dir*(i+1))>=0) {
    i++
  }
  return {x: pos.x+(i*dir), y: pos.y+i}
}

function createLine(arr, pos, dir) {
    var i = 0
    var line= []
    while (pos.y-i>=0 && pos.x+(dir*i)>=0 && arr[pos.y-i].length>pos.x+(dir*i)) {
      line.push(arr[pos.y-i][pos.x+(i*dir)])
      i++
    }
    return line
}

function arrayFourCheck(arr,player) {
  if (arr.length<4) {
    return false
  }
  var j = 0
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]==player) {
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
