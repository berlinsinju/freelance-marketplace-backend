const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSamples } = require('../middleware/upload');
const {
  createService, updateService, deleteService, getServices, getServiceById, getMyServices,
  uploadServiceSamples,
} = require('../controllers/serviceController');

router.get('/mine', protect, authorize('freelancer'), getMyServices);
router.post(
  '/samples',
  protect,
  authorize('freelancer'),
  uploadSamples,
  uploadServiceSamples
);
router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', protect, authorize('freelancer'), createService);
router.put('/:id', protect, authorize('freelancer'), updateService);
router.delete('/:id', protect, authorize('freelancer'), deleteService);

module.exports = router;
