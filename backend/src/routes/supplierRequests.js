import { Router } from 'express';
import Joi from 'joi';
import Supplier from '../models/Supplier.js';
import SupplierRequest from '../models/SupplierRequest.js';
import { idParam, pagination } from '../validators/common.js';
import { sendEmail } from '../utils/mailer.js';

const router = Router();

const itemSchema = Joi.object({
  stock: Joi.string().hex().length(24).optional(),
  name: Joi.string().required(),
  quantity: Joi.number().required(),
  unit: Joi.string().allow('')
});

const requestBody = Joi.object({
  supplier: Joi.string().hex().length(24).required(),
  items: Joi.array().items(itemSchema).min(1).required(),
  notes: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'closed').optional(),
  sendEmail: Joi.boolean().default(false)
});

router.get('/', async (req, res) => {
  const { value: q } = pagination.validate(req.query);
  const docs = await SupplierRequest.find()
    .populate('supplier', 'name email company status')
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .sort({ updatedAt: -1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { value, error } = requestBody.validate(req.body);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  const supplier = await Supplier.findById(value.supplier);
  if (!supplier) throw Object.assign(new Error('Supplier not found'), { status: 404 });

  const doc = await SupplierRequest.create({
    supplier: supplier._id,
    items: value.items,
    notes: value.notes,
    status: value.status || (value.sendEmail ? 'sent' : 'draft')
  });

  if (value.sendEmail && supplier.email) {
    const itemsHtml = value.items
      .map((i) => `<li>${i.name} – ${i.quantity}${i.unit ? ' ' + i.unit : ''}</li>`)
      .join('');
    await sendEmail({
      to: supplier.email,
      subject: `Request for Quotation – ${supplier.company || supplier.name}`,
      html: `<p>Dear ${supplier.name},</p>
             <p>Please provide a quotation for the following items:</p>
             <ul>${itemsHtml}</ul>
             ${value.notes ? `<p>Notes: ${value.notes}</p>` : ''}
             <p>Regards,<br/>Inventory Manager</p>`
    });
    doc.emailSentAt = new Date();
    await doc.save();
  }

  res.status(201).json(doc);
});

router.get('/:id', async (req, res) => {
  const { error } = idParam.validate(req.params);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const doc = await SupplierRequest.findById(req.params.id).populate('supplier', 'name email company');
  if (!doc) throw Object.assign(new Error('Request not found'), { status: 404 });
  res.json(doc);
});

router.patch('/:id/status', async (req, res) => {
  const { error } = idParam.validate(req.params);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  const body = Joi.object({
    status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'closed').required()
  }).validate(req.body);
  if (body.error) throw Object.assign(new Error(body.error.message), { status: 400 });

  const doc = await SupplierRequest.findByIdAndUpdate(
    req.params.id,
    { status: body.value.status, updatedAt: Date.now() },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error('Request not found'), { status: 404 });
  res.json(doc);
});

export default router;
