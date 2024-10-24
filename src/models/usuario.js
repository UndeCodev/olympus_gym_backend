// import { DataTypes } from "sequelize";
// import bcrypt from "bcrypt";
// import db from "../config/db.js";

// const Usuario = db.define(
//   "Usuario",
//   {
//     id: {
//       primaryKey: true,
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//     },
//     nombre: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     apellidos: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     telefono: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true
//     },
//     fechaNacimiento: {
//       type: DataTypes.DATE,
//     },
//     rol: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       defaultValue: 'user',
//     },
//     isEmailVerified: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     password: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     failedLoginAttempts: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0
//     },
//     isLocked: {
//       // Set maximum length
//       type: DataTypes.BOOLEAN,
//       defaultValue: false
//     },
//     lockTime: {
//       type: DataTypes.BIGINT,
//       allowNull: true
//     },
//     lastAttempt: {
//       type: DataTypes.DATE,
//       allowNull: true
//     }
//   },
//   {
//     tableName: 'usuarios',
//     hooks: {
//       // Hook para encriptar la contraseña antes de guardar
//       beforeCreate: async (usuario) => {
//         if (usuario.password) {
//           const salt = await bcrypt.genSalt(10);
//           usuario.password = await bcrypt.hash(usuario.password, salt);
//         }
//       },
//       beforeUpdate: async (usuario) => {
//         if (usuario.changed('password')) {
//           const salt = await bcrypt.genSalt(10);
//           usuario.password = await bcrypt.hash(usuario.password, salt);
//         }
//       },
//     },
//   }
// );

// Usuario.prototype.validarPassword = async function(password) {
//     return await bcrypt.compare(password, this.password);
// }
// export default Usuario;
