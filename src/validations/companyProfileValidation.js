import { checkSchema } from "express-validator";

export const companyProfileRules = checkSchema({
  pageTitle: {
    notEmpty: { errorMessage: `El campo pageTitle es obligatorio` },
    isString: { errorMessage: 'El campo pageTitle debe ser un string' }
  }, 
  slogan: {
    notEmpty: { errorMessage: `El campo slogan es obligatorio` },
    isString: { errorMessage: 'El campo slogan debe ser un string' }
  }, 
  email: {
    notEmpty: { errorMessage: `El campo email es obligatorio` },
    isEmail: { errorMessage: 'El campo email debe ser un email válido' }
  }, 
  phoneNumber: {
    notEmpty: { errorMessage: `El campo phoneNumber es obligatorio` },
    isString: { errorMessage: 'El campo phoneNumber debe ser un string' }
  }, 
  address: {
    notEmpty: { errorMessage: `El campo address es obligatorio` },
    isJSON: { errorMessage: `El campo socialMedia debe ser un JSON` }
  }, 
  socialMedia: {
    notEmpty: { errorMessage: `El campo socialMedia es obligatorio` },
    isJSON: { errorMessage: `El campo socialMedia debe ser un JSON` }
  }
});