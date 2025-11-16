import { Router } from 'express';
import { createAddress, getAddresses, deleteAddress, updateAddress } from '../controllers/addressController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       '201':
 *         description: Address created
 *   get:
 *     summary: Get list of addresses for the current user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of addresses
 */
router.route('/').post(protect, createAddress).get(protect, getAddresses);

/**
 * @openapi
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete an address by ID
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Address ID
 *     responses:
 *       '200':
 *         description: Address deleted
 */
router.route('/:id').delete(protect, deleteAddress).put(protect, updateAddress);

export default router;
