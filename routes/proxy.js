var express = require('express');
var router = express.Router();
var conn = require('../db/conn');
const request = require('request');
const uuid = require('uuid');
const logger = require('../config/winston')
var fs  = require('fs');

var jendek_domain_table = 'jendek-domain';

router.get('/mock.jpeg', (req, res, next) => {
    fs.readFile('cobain.png', (err, data) => {
        // if (err) throw err;
        const buf = Buffer.from(data);
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-disposition': 'attachment; filename=data.jpeg'
        });
        res.write(buf);
        res.end();
    });
})



module.exports = router;
