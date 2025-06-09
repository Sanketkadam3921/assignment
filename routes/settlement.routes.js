import express from 'express';
import settlementController from '../controllers/settlement.controller.js';

const router = express.Router();

// GET /balances
router.get('/balances', settlementController.getBalances);

// GET /settlements
router.get('/settlements', settlementController.getSettlements);

export default router;