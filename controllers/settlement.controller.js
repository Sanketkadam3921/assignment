import settlementService from '../services/settlement.service.js';

const settlementController = {
    // GET /balances
    async getBalances(req, res) {
        try {
            const balances = await settlementService.calculateBalances();
            return res.status(200).json({
                success: true,
                data: balances,
                message: 'Balances calculated successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    // GET /settlements
    async getSettlements(req, res) {
        try {
            const settlements = await settlementService.calculateSettlements();
            return res.status(200).json({
                success: true,
                data: settlements,
                message: 'Settlements calculated successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
};

export default settlementController;