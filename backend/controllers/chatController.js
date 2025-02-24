const chatService = require('../services/chatService');
const platformService = require('../services/platformService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  history: (req, res) => sendServiceResult(res, chatService.getHistory({ room: req.query.room, user: req.query.user })),
  send: (req, res) => sendServiceResult(res, chatService.sendMessage(req.body)),
  listRooms: (_req, res) => sendServiceResult(res, platformService.listChatRooms()),
  createRoom: (req, res) => sendServiceResult(res, platformService.createChatRoom(req.body)),
  getRoom: (req, res) => sendServiceResult(res, platformService.getChatRoom(req.params.id)),
  updateRoom: (req, res) => sendServiceResult(res, platformService.updateChatRoom(req.params.id, req.body)),
  deleteRoom: (req, res) => sendServiceResult(res, platformService.deleteChatRoom(req.params.id))
};
