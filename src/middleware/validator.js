import Joi from 'joi';

export const schemas = {
  sendEmail: Joi.object({
    to: Joi.alternatives().try(
      Joi.string().email().required(),
      Joi.array().items(Joi.string().email()).min(1).required()
    ).required(),
    subject: Joi.string().min(1).max(500).required(),
    template: Joi.string().optional(),
    html: Joi.string().optional(),
    text: Joi.string().optional(),
    data: Joi.object().optional(),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.alternatives().try(Joi.string(), Joi.binary()).optional(),
        path: Joi.string().optional(),
        contentType: Joi.string().optional(),
      })
    ).optional(),
  }).or('template', 'html'),

  sendBulkEmail: Joi.object({
    emails: Joi.array().items(
      Joi.object({
        to: Joi.string().email().required(),
        subject: Joi.string().min(1).max(500).required(),
        template: Joi.string().optional(),
        html: Joi.string().optional(),
        data: Joi.object().optional(),
      }).or('template', 'html')
    ).min(1).max(100).required(),
  }),
};

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    req.validatedData = value;
    next();
  };
};
