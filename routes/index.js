var express = require('express');
var router = express.Router();
const { jdDomain } = require('../sequelize')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/api/domain', function (req, res, next) {
  jdDomain.findAll().then(
    jdDomainData => res.json(jdDomainData)
  )
})

router.get('/api/domain/add', function (req, res, next) {
  jdDomain.create({
    name: 'test 123',
    push_id: 'test push 123',
    token: 'test token 123'
  }).then(
    jdDomainData => res.json(jdDomainData)
  )
})

router.get('/api/domain/delete', function (req, res, next) {
  jdDomain.destroy({
    where: {
      id: 1
    }
  }).then(
    res.send({})
  )
})

router.get('/api/domain/:domainId?', function (req, res, next) {
  let domainData;
  if (req.params.domainId) {
    domainData = jdDomain.findAll({
      where: {
        id:req.params.domainId
      }
    })
  } else {
    domainData = jdDomain.findAll()
  }
  domainData.then(
    jdDomainData => res.json(jdDomainData)
  )
})

module.exports = router;
