"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const addressController_1 = require("../controllers/addressController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
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
router.route('/').post(authMiddleware_1.protect, addressController_1.createAddress).get(authMiddleware_1.protect, addressController_1.getAddresses);
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
router.route('/:id').delete(authMiddleware_1.protect, addressController_1.deleteAddress).put(authMiddleware_1.protect, addressController_1.updateAddress);
exports.default = router;
