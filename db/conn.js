var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123Abc+",
  database: "jendek-wa"
});

module.exports = con;