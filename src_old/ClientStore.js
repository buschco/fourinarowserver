clients = []
var uuidv1 = require('uuid/v1')

exports.addUser = function (deviceId, cb) {
  var id = uuidv1()
  clients[id]={
    id: id,
    deviceId: deviceId,
  }
  cb(clientId)
}

exports.removePlayer = function (id) {
  delete clients[id]
}

exports.getUser = function (id,cb) {
  cb(clients[id])
};
