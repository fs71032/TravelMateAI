const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const healthController = require('../controllers/healthController');
const authController = require('../controllers/authController');
const itineraryController = require('../controllers/itineraryController');
const notificationController = require('../controllers/notificationController');
const chatController = require('../controllers/chatController');
const destinationController = require('../controllers/destinationController');
const bookingController = require('../controllers/bookingController');
const userController = require('../controllers/userController');
const rbacController = require('../controllers/rbacController');
const platformController = require('../controllers/platformController');
const searchController = require('../controllers/searchController');
const dataPortController = require('../controllers/dataPortController');
const auditController = require('../controllers/auditController');

const router = express.Router();

router.get('/health', healthController.health);

router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.post('/auth/update', requireAuth, authController.updateProfile);
router.post('/auth/refresh', authController.refresh);
router.get('/refresh-tokens', requireAuth, requireRole('admin'), authController.listRefreshTokens);
router.delete('/refresh-tokens/:id', requireAuth, requireRole('admin'), authController.revokeRefreshToken);

router.get('/itinerary/status', requireAuth, itineraryController.status);
router.post('/itinerary/generate', requireAuth, itineraryController.generate);
router.get('/itinerary/plans', requireAuth, itineraryController.listPlans);
router.post('/itinerary/plans', requireAuth, itineraryController.savePlan);
router.delete('/itinerary/plans/:id', requireAuth, itineraryController.deletePlan);
router.get('/itinerary/plans/:id', requireAuth, itineraryController.getPlan);
router.get('/itinerary/items', requireAuth, itineraryController.listItems);
router.post('/itinerary/items', requireAuth, itineraryController.createItem);
router.patch('/itinerary/items/:id', requireAuth, itineraryController.updateItem);
router.delete('/itinerary/items/:id', requireAuth, itineraryController.deleteItem);

router.get('/notifications', requireAuth, notificationController.list);
router.post('/notifications', requireAuth, notificationController.create);
router.patch('/notifications/:id', requireAuth, notificationController.update);
router.delete('/notifications/:id', requireAuth, notificationController.remove);

router.get('/chat/history', requireAuth, chatController.history);
router.post('/chat/messages', requireAuth, chatController.send);
router.get('/chat/rooms', requireAuth, chatController.listRooms);
router.post('/chat/rooms', requireAuth, chatController.createRoom);
router.get('/chat/rooms/:id', requireAuth, chatController.getRoom);
router.patch('/chat/rooms/:id', requireAuth, chatController.updateRoom);
router.delete('/chat/rooms/:id', requireAuth, chatController.deleteRoom);

router.get('/destinations', destinationController.list);

router.get('/bookings', requireAuth, bookingController.list);
router.get('/bookings/:id', requireAuth, bookingController.getById);
router.post('/bookings', requireAuth, bookingController.create);
router.patch('/bookings/:id', requireAuth, bookingController.update);
router.delete('/bookings/:id', requireAuth, bookingController.remove);

router.get('/users', requireAuth, requireRole('admin'), userController.list);
router.get('/users/:id', requireAuth, userController.getById);
router.patch('/users/:id', requireAuth, requireRole('admin'), userController.update);
router.delete('/users/:id', requireAuth, requireRole('admin'), userController.remove);

router.get('/roles', requireAuth, rbacController.listRoles);
router.post('/roles', requireAuth, requireRole('admin'), rbacController.createRole);
router.get('/roles/:id', requireAuth, rbacController.getRole);
router.patch('/roles/:id', requireAuth, requireRole('admin'), rbacController.updateRole);
router.delete('/roles/:id', requireAuth, requireRole('admin'), rbacController.deleteRole);