import { checkSchema } from "express-validator";

export const userRegistrationValidation = checkSchema({
  firstname: {
    notEmpty: { errorMessage: "El nombre es obligatorio" },
  },
  lastname: {
    notEmpty: { errorMessage: "El apellido es obligatorio" },
  },
  phone: {
    notEmpty: { errorMessage: "El teléfono es obligatorio" },
    isMobilePhone: {
      options: ["any"],
      errorMessage: "Debe proporcionar un número de teléfono válido",
    },
  },
  birthdate: {
    notEmpty: { errorMessage: "La fecha de nacimiento es obligatoria" },
    matches: {
      options: [/^\d{4}-\d{2}-\d{2}$/],
      errorMessage: 'La fecha debe estar en el formato YYYY-MM-DD'
    }
  },
  email: {
    notEmpty: { errorMessage: "El email es obligatorio" },
    isEmail: { errorMessage: "Debe proporcionar un email válido" },
  },
  password: {
    notEmpty: { errorMessage: "La contraseña es obligatoria" },
  },
});

export const userLoginValidation = checkSchema({
  email: {
    notEmpty: { errorMessage: "El email es obligatorio" },
    isEmail: { errorMessage: "Debe proporcionar un email válido" },
  },
  password: {
    notEmpty: { errorMessage: "La contraseña es obligatoria" },
  },
  tokenCaptcha: {
    notEmpty: { errorMessage: "El token del captcha es obligatorio" },
  },
});

export const userChangePassword = checkSchema({
  email: {
    notEmpty: { errorMessage: "El email es obligatorio" },
    isEmail: { errorMessage: "Debe proporcionar un email válido" },
  },
  oldPassword: {
    notEmpty: { errorMessage: "La contraseña actual es obligatoria" },
  },
  newPassword: {
    notEmpty: { errorMessage: "La nueva contraseña es obligatoria" },
  },
});
