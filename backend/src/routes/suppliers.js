import { Router } from 'express';
import Joi from 'joi';
import Supplier from '../models/Supplier.js';
import { idParam, pagination } from '../validators/common.js';

const router = Router();

const supplierBody = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zipCode: Joi.string().allow(''),
    country: Joi.string().allow('')
  }).default({}),
  company: Joi.string().required(),
  products: Joi.array().items(Joi.string()).default([]),
  status: Joi.string().valid('active', 'inactive', 'pending').default('active')
});

router.get('/', async (req, res) => {
  const { value: q } = pagination.validate(req.query);
  const docs = await Supplier.find()
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .sort({ updatedAt: -1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { value, error } = supplierBody.validate(req.body);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const created = await Supplier.create(value);
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const { error } = idParam.validate(req.params);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const doc = await Supplier.findById(req.params.id);
  if (!doc) throw Object.assign(new Error('Supplier not found'), { status: 404 });
  res.json(doc);
});

router.put('/:id', async (req, res) => {
  const { error: idErr } = idParam.validate(req.params);
  if (idErr) throw Object.assign(new Error(idErr.message), { status: 400 });
  const { value, error } = supplierBody.validate(req.body);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const updated = await Supplier.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true
  });
  if (!updated) throw Object.assign(new Error('Supplier not found'), { status: 404 });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const { error } = idParam.validate(req.params);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const del = await Supplier.findByIdAndDelete(req.params.id);
  if (!del) throw Object.assign(new Error('Supplier not found'), { status: 404 });
  res.json({ ok: true });
});

export default router;
