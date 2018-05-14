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
  var startPos = []
  startPos[0]={x:0,y:pos.y}
  startPos[1]={x:pos.x,y:arr.length}
  startPos[2]=getDiagStart(arr,pos, -1)
  startPos[3]=getDiagStart(arr,pos, 1)
  var arraysToCheck = []
  arraysToCheck.push(createRow(arr, pos))
  arraysToCheck.push(createCol(arr, pos))
  arraysToCheck.push(createLine(arr,startPos[3], -1))
  arraysToCheck.push(createLine(arr,startPos[2], 1))
  for (var i = 0; i < arraysToCheck.length; i++) {
    var winIndex=arrayFourCheck(arraysToCheck[i].line,player)
    if (winIndex!=undefined) {
      var winline = []
      for (var j = 0; j < arraysToCheck.length; j++) {
        winline.push(arraysToCheck[i].cord[winIndex[j]])
      }
      return winline
    }
  }
  return undefined
}

function createCol(arr, pos) {
  if(arr===undefined || pos===undefined) return
  var line = []
  var cord = []
  for (var i = 0; i < arr.length; i++) {
    line.push(arr[i][pos.x])
    cord.push({x: pos.x, y: i})
  }
  return {line: line, cord: cord}
}

function createRow(arr, pos) {
  if(arr===undefined || pos===undefined) return
  var line = []
  var cord = []
  for (var i = 0; i < arr[pos.y].length; i++) {
    line.push(arr[pos.y][i])
    cord.push({x: i, y: pos.y})
  }
  return {line: line, cord: cord}
}

function getDiagStart(arr, pos, dir) {
  if(arr===undefined || pos===undefined || dir === undefined) return
  var i = 0;
  while (pos.y+i<arr.length && pos.x+(dir*i)>=0 && pos.x+(dir*i)<arr[pos.y-i].length) {
    i++
  }
  i--
  return {x: pos.x+(dir*i), y: pos.y+i}
  // if(pos.y==arr.length){
  //   return pos
  // }
  // let i = 0
  // while (arr.length-1>pos.y+i && arr[i].length-1>pos.x+(dir*i) && pos.x+(dir*(i+1))>=0) {
  //   i++
  // }
  // return {x: pos.x+(i*dir), y: pos.y+i}
}

function createLine(arr, pos, dir) {
  if(arr===undefined || pos===undefined || dir === undefined) return
    var i = 0
    var line= []
    var cord=[]
    while (pos.y-i>=0 && pos.x+(dir*i)>=0 && arr[pos.y-i].length>pos.x+(dir*i)) {
      cord.push({y: pos.y-i, x: pos.x+(i*dir)})
      line.push(arr[pos.y-i][pos.x+(i*dir)])
      i++
    }
  return {line: line, cord: cord}
}

function arrayFourCheck(arr, player) {
  var row =[]
  if (arr.length<4) {
    return undefined
  }
  var j = 0
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]==player) {
      row.push(i)
      j++
      if (j==4) {
        return row
      }
    } else {
      row = []
      j=0
    }
  }
  return undefined
}
