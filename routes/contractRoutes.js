const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createContract, getMyContracts, getContractById, updateMilestoneStatus,
} = require('../controllers/contractController');

router.get('/mine', protect, getMyContracts);
router.get('/:id', protect, getContractById);
router.post('/', protect, authorize('client'), createContract);
router.put('/:id/milestones/:milestoneId', protect, updateMilestoneStatus);

module.exports = router;
