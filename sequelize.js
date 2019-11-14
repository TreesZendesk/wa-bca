const Sequelize = require('sequelize')
const jdDomainModel = require('./models/jendek-domain')

const sequelize = new Sequelize('jendekwa', 'root', '123Abc+', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
})

const jdDomain = jdDomainModel(sequelize, Sequelize)

// sequelize.sync({ force: true })
//   .then(() => {
//     console.log(`Database & tables created!`)
//   })

module.exports = {
    jdDomain
}