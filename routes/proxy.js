var express = require('express');
var router = express.Router();
var conn = require('../db/conn');
const request = require('request');
const uuid = require('uuid');
const logger = require('../config/winston')
var fs  = require('fs');

var jendek_domain_table = 'jendek-domain';

router.get('/mock.jpeg', (req, res, next) => {
res.sendFile("response.jpeg")
})


module.exports = router;
