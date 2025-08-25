const Joi = require("joi");

const validateUserRegistration = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(4).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  return schema.validate(data);
};
const validatelogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  return schema.validate(data);
};

module.exports = { validateUserRegistration ,validatelogin };
