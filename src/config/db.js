import { Sequelize } from "sequelize";

const db = new Sequelize('olympus_gym', 'root', 'masterv1', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

export default db;