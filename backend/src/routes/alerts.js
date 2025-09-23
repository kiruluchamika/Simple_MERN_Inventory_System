import { Router } from 'express';
import Joi from 'joi';
import Stock from '../models/Stock.js';

const router = Router();

/**
 * GET /api/alerts/low-stock
 * returns items where quantity <= threshold
 */
router.get('/low-stock', async (_req, res) => {
  const items = await Stock.find({
    $expr: { $lte: ['$quantity', '$threshold'] }
  }).sort({ itemName: 1 });
  res.json({ count: items.length, items });
});

/**
 * GET /api/alerts/expiry?days=30
 * - nearExpiry: expiryDate within `days` from now (and not expired yet)
 * - expired: expiryDate < now
 */
router.get('/expiry', async (req, res) => {
  const { value, error } = Joi.object({ days: Joi.number().min(1).default(30) }).validate(req.query);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  const now = new Date();
  const near = new Date(now.getTime() + value.days * 24 * 60 * 60 * 1000);

  const nearExpiry = await Stock.find({
    expiryDate: { $gte: now, $lte: near }
  }).sort({ expiryDate: 1 });

  const expired = await Stock.find({
    expiryDate: { $lt: now }
  }).sort({ expiryDate: 1 });

  res.json({ nearDays: value.days, nearExpiry, expired });
});

export default router;
