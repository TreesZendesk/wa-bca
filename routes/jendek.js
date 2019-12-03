var express = require('express');
var router = express.Router();
var conn = require('../db/conn');
const request = require('request');
const uuid = require('uuid');
const logger = require('../config/winston')
var fs  = require('fs');
var requestPromise = require('request-promise');

var jendek_domain_table = 'jendek-domain';

var jendek_domain = "bcafinancehelp1569566623"

router.get('/manifest', (req, res, next) => {
    // let host = req.hostname
    let host = "expo.bcaf.id/zConnector"

    res.status(200).send({
        name: "WhatsApp-bca",
        id: "new-bca-zendesk-wa.uniquebcaf",
        author: "Trees Solutions",
        version: "v1.0.0",
        push_client_id: "zd_trees_integration",
        urls: {
            admin_ui: "https://" + host + "/jendek/integration/admin",
            pull_url: "https://" + host + "/jendek/integration/pull",
            channelback_url: "https://" + host + "/jendek/integration/channelback",
            clickthrough_url: "https://" + host + "/jendek/integration/clickthrough"
        }
    })
})

router.post('/integration/admin', (req, res, next) => {
    // console.log(req.body);
    logger.info(JSON.stringify(req.body));
    res.render('admin', {
        title: 'CIF Admin',
        return_url: req.body.return_url,
        instance_push_id: req.body.instance_push_id,
        zendesk_access_token: req.body.zendesk_access_token,
        locale: req.body.locale,
        subdomain: req.body.subdomain
    });
})

 /* for testing, ignore this */
router.get('/integration/admin', (req, res, next) => {
    console.log(req.body.return_url);
    logger.info(JSON.stringify(req.body.return_url));
    res.render('admin', {
        title: 'CIF Admin'
    });
})

router.post('/integration/register', (req, res, next) => {
    // console.log(req.body);
    logger.info(JSON.stringify(req.body));
    
    let metadata = {};
    let sender = req.body.sender
    metadata['instance_push_id'] = req.body.instance_push_id;
    metadata['zendesk_access_token'] = req.body.zendesk_access_token;
    metadata['subdomain'] = req.body.subdomain;
    metadata['locale'] = req.body.locale;
    metadata['return_url'] = req.body.return_url;
    metadata['sender'] = sender;

    let name = "Whatsapp : " + req.body.phone + " - " + sender
    // addDomain('domain123', req.body.instance_push_id, 'token123', res);

    res.render('register', {
        title: 'CIF Confirmation Page',
        return_url: req.body.return_url,
        metadata: JSON.stringify(metadata),
        state: JSON.stringify({}),
        name: name
    });
})

router.post('/integration/push/from-core', (req, res, next) => {
    let externalRsrc = [];
    let externalRsrcs = {};
    let instance_push_id = req.body.push_id;
    let token_push = req.body.token;
    let sender = req.body.channel

    let msgObj = {};

    console.log(JSON.stringify(req.body));
    logger.info(JSON.stringify(req.body));
    console.log(req.body.messages)
    for (var i=0; i<req.body.messages.length; i++) {
        let userName = ""
        for (var j=0; j<req.body.contacts.length; j++) {
            if (req.body.contacts[j].wa_id == req.body.messages[i].from) {
                userName = req.body.contacts[j].profile.name
            }
        }

        var msgType = req.body.messages[i].type
        var jendekExternalId = 'wa-msg-' + req.body.messages[i].id + "-" + sender
        var jendekUserExternalId = 'wa-user-' + req.body.messages[i].from 
        var jendekThreadExternalId = 'wa-conv-' + req.body.messages[i].from + "-" + sender

        if (msgType == "text") {
            msgObj = {
                external_id: jendekExternalId,
                message: req.body.messages[i].text.body,
                thread_id: jendekThreadExternalId,
                created_at: new Date().toISOString(),
                author: {
                    external_id: jendekUserExternalId,
                    name: userName
                },
                allow_channelback: true
            }
        } else if (msgType == "image") {
            var imageChannel = req.body.channel
            var imageId = req.body.messages[i].image.id
            var fileUrl = generateFileUrl(req, imageId, imageChannel)

            msgObj = {
                external_id: jendekExternalId,
                message: req.body.messages[i].image.caption || "-image from user-",
                thread_id: jendekThreadExternalId,
                created_at: new Date().toISOString(),
                author: {
                    external_id: jendekUserExternalId,
                    name: userName
                },
                file_urls: [
                    fileUrl
                ],
                allow_channelback: true
            }
        }
        externalRsrc.push(msgObj);
        msgObj = {};
    }
    
    externalRsrcs = {
        instance_push_id: instance_push_id,
        external_resources: externalRsrc
    }

    console.log(externalRsrcs);
    logger.info(JSON.stringify(externalRsrcs));

    var pushJendekUrl = 'https://' + jendek_domain + '.zendesk.com/api/v2/any_channel/push.json';

    console.log(JSON.stringify(externalRsrcs));
    request({
        url: pushJendekUrl,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token_push
        },
        json: externalRsrcs
    }, function (err, newRes) {
        console.log(newRes.statusCode);
        logger.info(JSON.stringify(newRes.statusCode));
        if (newRes.statusCode == 200) {
            res.status(200).send({
                external_id: jendekExternalId,
                response: newRes["status"]
            });
        } else {
            res.status(500).send({
                error: "error",
                reason: err
            });
        }
    });
})

router.post('/integration/push', (req, res, next) => {
    let externalRsrc = [];
    let externalRsrcs = {};
    let instance_push_id = req.body.push_id;
    let token_push = req.body.token;
    let created_at = req.body.created_at;
    let sender = req.body.sender
    let msgObj = {};

    console.log(JSON.stringify(req.body));
    logger.info(JSON.stringify(req.body));
    var jendekExternalId = 'wa-msg-' + uuid.v4() + '-' + sender
    var jendekUserExternalId = 'wa-user-' + req.body.to
    var jendekThreadExternalId = 'wa-conv-' + req.body.to + '-' + sender
    msgObj = {
        external_id: jendekExternalId,
        message: req.body.text.body,
        thread_id: jendekThreadExternalId,
        created_at: created_at,
        author: {
            external_id: jendekUserExternalId,
            name: req.body.to
        },
        allow_channelback: true
    }
    externalRsrc.push(msgObj);
    msgObj = {};
    externalRsrcs = {
        instance_push_id: instance_push_id,
        external_resources: externalRsrc
    }

    console.log(externalRsrcs);

    var pushJendekUrl = 'https://' + jendek_domain + '.zendesk.com/api/v2/any_channel/push.json';

    console.log(JSON.stringify(externalRsrcs));
    request({
        url: pushJendekUrl,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token_push
        },
        json: externalRsrcs
    }, function (err, newRes) {
        console.log(newRes.statusCode);
        logger.info(JSON.stringify(newRes.statusCode));
        if (newRes.statusCode == 200) {
            res.status(200).send({
                external_id: jendekExternalId,
                response: newRes["status"]
            });
        } else {
            res.status(500).send({
                error: "error",
            });
        }
    });
})

router.post('/integration/pull', (req, res, next) => {
    res.status(200).send({});
})

const getMedia = async ({ params }, res) => {
    var getMediaId = params.mediaid;
    var getChannel = params.channel;
    
    logger.info("getMediaId");
    logger.info(JSON.stringify(getMediaId));
    logger.info("getChannel");
    logger.info(JSON.stringify(getChannel));

    request({
        url: "https://bcafelearning.bcaf.id/zConnector/wacoreproxygetimage/api/wa/v1/media/get",
        rejectUnauthorized: false,
        method: 'POST',
        json: {
            "channel": getChannel,
            "mediaId": getMediaId
        },
        headers: {
            "Content-Type": "application/json",
            "accept": "image/jpeg"
        },
    }, function (error, newRes) {
        // console.log(error);
        // console.log(newRes.body);
        if (error || newRes.body.status == "500") {
            res.status(500).send({});
        }
        else {
            const buf = Buffer.from(newRes.body);
            // res.writeHead(200, {
            //     'Content-Type': 'image/jpeg',
            //     'Content-disposition': 'attachment; filename=data.jpeg'
            // });
            // res.write(buf);
            res.end();
        }
    }).pipe(res);
};

router.get('/getmedia/:mediaid/:channel/:filename\.:ext?', getMedia)
router.post('/getmedia/:mediaid/:channel/:filename\.:ext?', getMedia)
 
// IGNORE - only for testing
router.get('/testing-image', (req, res, next) => {
    request({
        url: 'https://faskanskk1571648431.zendesk.com/attachments/token/iyselTHQrof21Jx95HlrrNBnM/?name=image-from-ios.jpg',
        method: 'GET',
    }, function (error, newRes) {
        console.log(newRes)
        let imageData = newRes.body

        let imageUploadUrl = ''

        const uploadImageRequest = {
            method: "POST",
            url: "http://192.168.29.189:9001/api/wa/v1/media/upload",
            headers: {
                "Content-Type": "multipart/form-data"
            },
            formData : {
                "image" : imageData,
                "mediaType": "image",
                "channelID": "102",
                "terminalID": "100",
                "customerRefNo": "99999999999",
                "sender": "KKB"
            }
        };
        
        request(uploadImageRequest, function (err, uploadRes, body) {
            if (err) {
                console.log(err);
            }
            console.log(body);
            console.log(uploadRes)
            res.status(200).send(uploadRes)
        });
    })
})

router.post('/integration/channelback', async (req, res, next) => {
    console.log(req.body);
    logger.info(JSON.stringify(req.body))
    let metadata = JSON.parse(req.body['metadata'])

    // console.log(fs.createReadStream('http://localhost:3000/proxy/mock.jpeg.png'))
    // let push_id = metadata.instance_push_id
    // let token_id = metadata.token_id
    let to = req.body.thread_id.split("-")[2]

    if (!req.body["file_urls[]"]) {
        request({
            url: "http://192.168.29.189:9001/api/wa/v1/text/send",
            method: 'POST',
            json: {
                "channelID": "102",
                "terminalID": "100",
                "sender": metadata.sender,
                "customerRefNo": "999999999",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {
                    "body": req.body.message
                }
            }
        }, function (error, chatRes) {
            if (chatRes.body.statusCode == "00") {
                res.status(200).send({...chatRes.body, external_id: chatRes.body.transactionRefNo});
            } else {
                res.status(500).send({
                    error: "error",
                });
            }
        });
    } else {
        // let fileUrl = req.body["file_urls[]"] instanceof Array ? req.body["file_urls[]"][0] : req.body["file_urls[]"]
        let fileUrl = ''
        let fileUrls = req.body["file_urls[]"]
        let urls = fileUrls instanceof Array ? fileUrls : [fileUrls]
        console.log(urls) 

        for (var i=0; i<urls.length; i++) {
            let newFileUrl = urls[i]
            var formData = {
                mediaType: "image",
                file: request(newFileUrl),
                channelID: 102,
                terminalID: 100,
                customerRefNo: "999999999",
                sender: metadata.sender
            }
            var uploadMedia = {
                method: 'POST',
                uri: 'http://192.168.29.189:9001/api/wa/v1/media/upload',
                formData: formData,
            };

            let uploadRes = await requestPromise(uploadMedia)
            // console.log(uploadResponse)
            let uploadResponse = JSON.parse(uploadRes)

            if (uploadResponse.statusCode == "00") {
                let uploadId = uploadResponse.media[0].id
                
                console.log(uploadId)

                let imgCaption = ''
                if ((i+1) == urls.length) {
                    imgCaption = req.body.message
                } else {
                    imgCaption = ''
                }
                var sendMessage = {
                    url: "http://192.168.29.189:9001/api/wa/v1/media/send",
                    method: 'POST',
                    json: {
                        "channelID": "102",
                        "terminalID": "100",
                        "sender": metadata.sender,
                        "customerRefNo": "999999999",
                        "recipient_type": "individual",
                        "to": to,
                        "type": "image",
                        "image": {
                            "id": uploadId,
                            "caption": imgCaption
                        }
                    }
                }

                let chatResponse = await requestPromise(sendMessage)
                if ((i+1) == urls.length) {
                    if (chatResponse.statusCode == "00") {
                        res.status(200).send({...chatResponse, external_id: chatResponse.transactionRefNo});
                    } else {
                        res.status(500).send({
                            error: "error",
                        });
                    }
                }
            }
        }
    }
})

router.post('/integration/clickthrough', (req, res, next) => {
    console.log(req.body);
    res.status(200).send({
        error: "system is not ready"
    });
})

router.get('/get_domain', (req, res, next) => {
    getDomain(res);
})

router.get('/add_domain', (req, res, next) => {
    // addDomain('domain123', 'push123', 'token123', res);
})

function generateFileUrl (req, mediaId, channel) {
    // let host = req.hostname
    let imgServer = "expo.bcaf.id"
    return "https://" + imgServer + "/zConnector/jendek/getmedia/" + mediaId + "/" + channel + "/image.jpeg"
}

function getDomain (res) {
    let dbResponse = {};
    let getQry = 'SELECT * FROM `' + jendek_domain_table + '`';
    conn.connect();

    conn.query(getQry, function (error, rows, fields) {
        if (error) {
            dbResponse = {
                error: error
            }
        } else {
            dbResponse = {
                success: rows
            }
        }
        res.status(200).send({
            response: dbResponse
        });
    });
    conn.end();
}

// function addDomain (jendekDomainName, jendekDomainPushId, jendekDomainToken, res) {
//     let dbResponse = {};
//     let insertData = {
//         jendek_domain_name: jendekDomainName,
//         jendek_domain_push_id: jendekDomainPushId,
//         jendek_domain_token: jendekDomainToken
//     }
//     let insertQry = 'INSERT INTO `' + jendek_domain_table + '` SET ?';
//     conn.connect();
//     conn.query(insertQry, insertData, function (error, rows, field) {
//         if (error) {
//             dbResponse = {
//                 error: error
//             };
//         } else {
//             dbResponse = {
//                 success: rows
//             };
//         }
//         res.status(200).send({
//             response: dbResponse
//         })
//     })
//     conn.end();
// }

module.exports = router;
