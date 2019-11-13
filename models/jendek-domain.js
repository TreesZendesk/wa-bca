module.exports = (sequelize, type) => {
    return sequelize.define('jd-domain', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: type.STRING,
        push_id: type.STRING,
        token: type.STRING
    })
}