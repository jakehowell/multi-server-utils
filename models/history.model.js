import {Sequelize, DataTypes, Model} from 'sequelize';
import {sequelize} from '../db.js';

export default class History extends Model {}
History.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    endpoint: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: ''
    },
    params: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    servers: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, { sequelize, modelName: 'history' });
