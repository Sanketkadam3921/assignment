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
            console.error('Error calculating balances:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while calculating balances',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
            console.error('Error calculating settlements:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while calculating settlements',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    },

    // GET /summary
    async getSummary(req, res) {
        try {
            const summary = await settlementService.getExpenseSummary();
            return res.status(200).json({
                success: true,
                data: summary,
                message: 'Expense summary retrieved successfully'
            });
        } catch (error) {
            console.error('Error getting expense summary:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while getting expense summary',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
};

export default settlementController;