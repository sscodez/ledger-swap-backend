// import { Router } from 'express';
// import {
//   startAutomatedSwaps,
//   stopAutomatedSwaps,
//   getAutomatedSwapStatus,
//   triggerManualSwap,
//   testAutomatedSwap,
//   addMonitoredAddress,
//   getSwapQueue,
//   getSystemHealth
// } from '../controllers/automatedSwapController';
// import { protect, isAdmin } from '../middleware/authMiddleware';

// const router = Router();

// /**
//  * @openapi
//  * /api/automated-swaps/start:
//  *   post:
//  *     summary: Start automated swap system
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       '200':
//  *         description: System started successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                 status:
//  *                   type: string
//  *                 swapService:
//  *                   type: object
//  *                 depositMonitoring:
//  *                   type: object
//  *       '500':
//  *         description: Failed to start system
//  */
// router.post('/start', protect, isAdmin, startAutomatedSwaps);

// /**
//  * @openapi
//  * /api/automated-swaps/stop:
//  *   post:
//  *     summary: Stop automated swap system
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       '200':
//  *         description: System stopped successfully
//  *       '500':
//  *         description: Failed to stop system
//  */
// router.post('/stop', protect, isAdmin, stopAutomatedSwaps);

// /**
//  * @openapi
//  * /api/automated-swaps/status:
//  *   get:
//  *     summary: Get automated swap system status
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       '200':
//  *         description: System status information
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: string
//  *                   enum: [running, stopped]
//  *                 swapService:
//  *                   type: object
//  *                   properties:
//  *                     queueSize:
//  *                       type: number
//  *                     processing:
//  *                       type: number
//  *                     isInitialized:
//  *                       type: boolean
//  *                 depositMonitoring:
//  *                   type: object
//  *                   properties:
//  *                     isRunning:
//  *                       type: boolean
//  *                     monitoredAddresses:
//  *                       type: number
//  *                     activeChains:
//  *                       type: number
//  *                 statistics:
//  *                   type: object
//  *                   properties:
//  *                     total:
//  *                       type: number
//  *                     completed:
//  *                       type: number
//  *                     failed:
//  *                       type: number
//  *                     successRate:
//  *                       type: string
//  */
// router.get('/status', protect, isAdmin, getAutomatedSwapStatus);

// /**
//  * @openapi
//  * /api/automated-swaps/health:
//  *   get:
//  *     summary: Get system health check
//  *     tags: [Automated Swaps]
//  *     responses:
//  *       '200':
//  *         description: System is healthy
//  *       '503':
//  *         description: System is unhealthy
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: string
//  *                   enum: [healthy, unhealthy]
//  *                 services:
//  *                   type: object
//  *                 statistics:
//  *                   type: object
//  */
// router.get('/health', getSystemHealth);

// /**
//  * @openapi
//  * /api/automated-swaps/queue:
//  *   get:
//  *     summary: Get current swap queue information
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       '200':
//  *         description: Swap queue information
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 queue:
//  *                   type: object
//  *                 pendingExchanges:
//  *                   type: array
//  *                   items:
//  *                     type: object
//  *                     properties:
//  *                       exchangeId:
//  *                         type: string
//  *                       from:
//  *                         type: object
//  *                       to:
//  *                         type: object
//  *                       status:
//  *                         type: string
//  */
// router.get('/queue', protect, isAdmin, getSwapQueue);

// /**
//  * @openapi
//  * /api/automated-swaps/manual/{exchangeId}:
//  *   post:
//  *     summary: Manually trigger swap for specific exchange
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: exchangeId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Exchange ID to trigger swap for
//  *     responses:
//  *       '200':
//  *         description: Manual swap triggered successfully
//  *       '400':
//  *         description: Invalid exchange ID
//  *       '404':
//  *         description: Exchange not found
//  */
// router.post('/manual/:exchangeId', protect, isAdmin, triggerManualSwap);

// /**
//  * @openapi
//  * /api/automated-swaps/test/{exchangeId}:
//  *   post:
//  *     summary: Test automated swap system with mock deposit
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: exchangeId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Exchange ID to test automated swap for
//  *     requestBody:
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               amount:
//  *                 type: number
//  *                 description: Mock deposit amount (optional)
//  *               currency:
//  *                 type: string
//  *                 description: Mock deposit currency (optional)
//  *               txHash:
//  *                 type: string
//  *                 description: Mock transaction hash (optional)
//  *     responses:
//  *       '200':
//  *         description: Test automated swap triggered successfully
//  *       '400':
//  *         description: Invalid exchange ID
//  *       '404':
//  *         description: Exchange not found
//  */
// router.post('/test/:exchangeId', protect, isAdmin, testAutomatedSwap);

// /**
//  * @openapi
//  * /api/automated-swaps/monitor:
//  *   post:
//  *     summary: Add address to monitoring
//  *     tags: [Automated Swaps]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - address
//  *               - exchangeId
//  *               - currency
//  *               - expectedAmount
//  *             properties:
//  *               address:
//  *                 type: string
//  *                 description: Deposit address to monitor
//  *               exchangeId:
//  *                 type: string
//  *                 description: Associated exchange ID
//  *               currency:
//  *                 type: string
//  *                 description: Expected currency
//  *               expectedAmount:
//  *                 type: number
//  *                 description: Expected deposit amount
//  *               expiresAt:
//  *                 type: string
//  *                 format: date-time
//  *                 description: When monitoring should expire
//  *     responses:
//  *       '200':
//  *         description: Address added to monitoring
//  *       '400':
//  *         description: Missing required fields
//  */
// router.post('/monitor', protect, isAdmin, addMonitoredAddress);

// export default router;
