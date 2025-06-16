import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import expenseRoutes from './routes/expense.routes.js';
import settlementRoutes from './routes/settlement.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(cors({
    origin: ['https://frontendassignment-three.vercel.app/'],
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/expenses', expenseRoutes);
app.use('/', settlementRoutes);

// Health check with database status
app.get('/', async (req, res) => {
    try {
        // Test database connection
        const { prisma } = await import('./db.js');
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: 'Split App API is running!',
            database: 'Connected',
            environment: process.env.NODE_ENV || 'development',
            endpoints: {
                expenses: '/expenses',
                people: '/expenses/people',
                balances: '/balances',
                settlements: '/settlements'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'API running but database connection failed',
            database: 'Disconnected',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Split App server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
});