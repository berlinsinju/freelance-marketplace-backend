const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createJob, updateJob, deleteJob, getJobs, getJobById, getMyJobs,
  submitProposal, updateProposalStatus,
} = require('../controllers/jobController');

router.get('/mine', protect, authorize('client'), getMyJobs);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', protect, authorize('client'), createJob);
router.put('/:id', protect, authorize('client'), updateJob);
router.delete('/:id', protect, authorize('client'), deleteJob);
router.post('/:id/proposals', protect, authorize('freelancer'), submitProposal);
router.put('/:id/proposals/:proposalId', protect, authorize('client'), updateProposalStatus);

module.exports = router;
