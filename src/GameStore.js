var games = []
var uuidv1 = require('uuid/v1')
/**
* This is um what es here goes
* @typedef {Object} Game
* @property {game_id} id - unique id of the game
* @property {number} bet - how much the players play for
* @property {size} size of the field
* @property {Player} players - Array of the players
* @property {number} playerCount - How many players are currently in the game
* @property {boolean} status - is set if a winner .. default=false
*/
/**
* @typedef {Object} Player
* @property {player_id} id - unique playerid
* @property {string} name - display name ot the player
* @property {boolean} ready - true if player is ready
*/
/**
* @typedef {Object} size
* @property {number} w - Width of the field
* @property {number} h - Height of the field
*/
/**
* options required to create a game
* @typedef {Object} game_options
* @property {number} bet - how much the players play for
* @property {size} size of the field
*/
/**
* Creates a game
* @param {game_options} options for the game
* @return {game_id} or null if error
*/
exports.createGame = function (options) {
  var id = uuidv1()
  games[id]={
    id: id,
    size: options.size,
    bet: options.bet,
    players: [],
    playerCount: 0,
    status: false
  }
  return id
}

/**
* Get a game by id
* @param {game_id} id of the game
* @return {Game} or null if error
*/
exports.getGame = function (id) {
  return games[id]
}

/**
* Get a filtered list of games
* @param {game_options} options that the game should have
* @param {number} betrange +- of the desired amout
* @return {Array<Game>} filtered List of games
*/
exports.getGames = function (options, betrange) {
  let res = []
  if(options.size==undefined) return []
  let w = options.size.w
  let h = options.size.h
  for (var i in games) {
    if (games[i].size.w == w && games[i].size.h==h &&
      games[i].players.length<=1 &&
      games[i].bet==options.bet) {        //// TODO: +-
      res.push(games[i])
    }
  }
  return res
}

/**
 * Deletes a game
 * @param {game_id} id of the game
 * @return {boolean} sucess
 */
exports.deleteGame = function (id) {
  var game = games[id]
  if(game===undefined || game.playerCount>=2) return false
  delete games[id]
  return true
}

/**
 * Add a player
 * @param {game_id} id of the game
 * @param {player_id} player_id of the player
 * @param {name} name of the player
 * @return {number} -1 on error. Otherwise the number of current players in game
 * @todo id for database cannot be the socket.id as it is right now
 */
exports.addPlayer = function (id, player_id, name) {
  var game = games[id]
  if(game===undefined || game.playerCount>=2) return -1
  games[id].players.push({
    id: id,
    name: name
  })
  return ++games[id].playerCount
}

/**
 * Removes a player from the given game id
 * @param {game_id} id of the game
 * @param {player_id} player_id id of the player
 * @return {Array<Player>} array of the player(s) left in the game or undefined on error
 */
exports.removePlayer = function(player_id, id) {
  if(games[id]===undefined) return undefined
  var index = getPlayerIndex(id, player_id)
  if(index<0) return undefined
  delete games[id].players[index]
  if(index==0) games[id].players[0]=games[id].players[1]
  return games[id].players
}

/**
 * Get the players in the game identified by id
 * @param  {game_id} id game id
 * @return {Array<Player>} Array containing the players in the game
 */
exports.getPlayers = function(id) {
  if(games[id]==undefined) return []
  return games[id].players
}

/**
 * returns a radom player_id
 * @param  {game_id} id
 * @return {player_id}
 */
exports.getRandomPlayer = function(id) {
  if (games[id]==undefined || games[id].players.length!=2) return undefined
  let index = Math.floor(Math.random() * 2)
  return games[id].players[index]
}

/**
 * set the players status with the id to status
 * @param  {game_id} id id of the game tbd: Braucht man eigentlich nicht unbdedingt
 * @param  {player_id} player_id the id of the player
 * @param  {boolean} ready new status
 * @return {number} index of the player on success or -1 on failure
 */
exports.setReady = function(id, player_id, status) {
  let index = getPlayerIndex(id, player_id)
  if(index>-1) games[id].players[index].ready=status
  return index
}

/**
 * retruns ready of the player
 * @param  {game_id} id
 * @param  {player_id} player_id
 * @return {boolean} undefined on error, Otherwise player ready
 */
exports.getReady = function(id, player_id) {
  let index = getPlayerIndex(id, player_id)
  if(index>-1) return games[id].players[index].status
  return undefined
}

/**
 * Checks if all playes in the game are ready
 * @param  {game_id} id
 * @return {boolean}
 */
exports.getReadyOfAll = function(id) {
  if (games[id]==undefined) return undefined
  for (var i = 0; i < games[id].players.length; i++) {
    if(games[id].players[i].ready == false) return false
  }
  return true
}

/**
 * Returns the status of the game
 * @param  {game_id} id
 * @return {boolean} undefined on error, false on not ingame, true on ingame
 */
exports.getStatus = function(id) {
  if(games[id]===undefined) return undefined
  return games[id].status
}

/**
 * Sets the status of the game
 * @param {game_id} id
 * @param {boolean} status the next status
 * @return {boolean} undefined on error, false on not ingame, true on ingame
 */
exports.setStatus = function(id, status) {
  if(games[id]===undefined) return undefined
  games[id].status = status
  return status
}

/**
 * Intern: Returns the index of the player in the players array
 * @param  {game_id} id
 * @param  {player_id} player_id
 * @return {number} index of the player or -1 on failure
 */
function getPlayerIndex(id, player_id) {
  if(player_id==undefined || games[id]==undefined || games[id].players == undefined) return -1 //kann vereinfacht werden wenn alles andere zuferaesssig laeuft
  for (var i = 0; i < games[id].players.length; i++) {
    if(games[id].players[i].id===player_id) return i
  }
  return -1
}
