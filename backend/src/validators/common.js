import Joi from 'joi';

export const idParam = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const pagination = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});
