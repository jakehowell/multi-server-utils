import { Sequelize } from 'sequelize';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './crmserverutils.db',
    define: {
        freezeTableName: true,
        timestamps: false
    }
});

sequelize.sync().then(() => {
    console.log('Database & tables created!');
}).catch((err) => {
    console.log('Error creating database & tables: ', err);
});

export { sequelize };
