var express = require('express');
var router = express.Router();
const request = require('request');
const uuid = require('uuid');
const logger = require('../config/winston')
var requestPromise = require('request-promise');
const { check, validationResult, body } = require('express-validator');
const httpContext = require('express-http-context');
const axios = require('axios');

const JENDEK_DOMAIN = process.env.ZENDESK_SUBDOMAIN || "bcafinancehelp1569566623"
const JENDEK_GROUP_AGENT_FIELDID = process.env.GROUP_AGENT_FIELDID || "360030138314"
const CIF_HOST = process.env.CIF_HOST || "expo.bcaf.id/zConnector"
const CIF_ID = process.env.CIF_ID || "new-bca-zendesk-wa.uniquebcaf"
const CIF_VERSION = process.env.CIF_VERSION || "v1.0.0";
const CIF_PUSH_CLIENT_ID = process.env.CIF_PUSH_CLIENT_ID || "zd_trees_integration";
const WA_URL = process.env.WA_URL || "192.168.29.189:9001"
const WA_MEDIA_URL = process.env.WA_MEDIA_URL || "192.168.29.191:9010"

router.get('/manifest', (req, res, next) => {
     res.status(200).send({
        name: "WhatsApp-bcaf",
        id: CIF_ID,
        author: "Trees Solutions",
        version: CIF_VERSION,
        push_client_id: CIF_PUSH_CLIENT_ID,
        urls: {
            admin_ui: "https://" + CIF_HOST + "/jendek/integration/admin",
            pull_url: "https://" + CIF_HOST + "/jendek/integration/pull",
            channelback_url: "https://" + CIF_HOST + "/jendek/integration/channelback",
            clickthrough_url: "https://" + CIF_HOST + "/jendek/integration/clickthrough"
        }
    })
})

router.post('/integration/admin', [
    check('return_url').exists(),
    check('instance_push_id').exists(),
    check('zendesk_access_token').exists(),
    check('locale').exists(),
    check('subdomain').exists()
], (req, res, next) => {
    logger.info("RequestBody: " + JSON.stringify(req.body));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    res.render('admin', {
        title: 'CIF Admin',
        return_url: req.body.return_url,
        instance_push_id: req.body.instance_push_id,
        zendesk_access_token: req.body.zendesk_access_token,
        locale: req.body.locale,
        subdomain: req.body.subdomain
    });
})

router.post('/integration/register', [
    check('phone').exists(),
    check('instance_push_id').exists(),
    check('zendesk_access_token').exists(),
    check('subdomain').exists(),
    check('locale').exists(),
    check('sender').exists()
], (req, res, next) => {
    logger.info("RequestBody: " + JSON.stringify(req.body));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    let metadata = {};
    let sender = req.body.sender
    metadata['instance_push_id'] = req.body.instance_push_id;
    metadata['zendesk_access_token'] = req.body.zendesk_access_token;
    metadata['subdomain'] = req.body.subdomain;
    metadata['locale'] = req.body.locale;
    metadata['return_url'] = req.body.return_url;
    metadata['sender'] = sender;

    let name = "Whatsapp : " + req.body.phone + " - " + sender

    res.render('register', {
        title: 'CIF Confirmation Page',
        return_url: req.body.return_url,
        metadata: JSON.stringify(metadata),
        state: JSON.stringify({}),
        name: name
    });
})

router.post('/integration/push/from-core', (req, res, next) => {
    logger.info("RequestBody: " + JSON.stringify(req.body));
    let externalRsrc = [];
    let externalRsrcs = {};
    let instance_push_id = req.body.push_id;
    let token_push = req.body.token;
    let sender = req.body.channel

    let msgObj = {};

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
            logger.info("message is text")
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
            logger.info("message is image")
            var imageChannel = req.body.channel
            var imageId = req.body.messages[i].image.id
            var fileUrl = generateFileUrl(imageId, imageChannel)

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

    var pushJendekUrl = 'https://' + JENDEK_DOMAIN + '.zendesk.com/api/v2/any_channel/push.json';
    logger.info("Calling " + pushJendekUrl + " Authorization Bearer: " + token_push + " Body: " + JSON.stringify(externalRsrcs));
    request({
        url: pushJendekUrl,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token_push
        },
        time: true,
        json: externalRsrcs
    }, function (err, newRes) {
        if (err) {
            logger.error(err)
            return res.status(500).send({
                error: "error",
                traceId: httpContext.get("traceId")
            });
        }

        logger.info("Called " + pushJendekUrl + " " + JSON.stringify({statusCode: newRes.statusCode, elapsedTime: newRes.elapsedTime + " ms", responseBody: newRes.body}))
        if (newRes.statusCode == 200) {
            res.status(200).send({
                external_id: jendekExternalId,
                response: newRes["status"]
            });
        } else {
            res.status(newRes.statusCode).send({
                error: "error",                
                traceId: httpContext.get("traceId")
            })
        }
    });
})

router.post('/integration/push', (req, res, next) => {
    logger.info("RequestBody: " + JSON.stringify(req.body));

    let externalRsrc = [];
    let externalRsrcs = {};
    let instance_push_id = req.body.push_id;
    let token_push = req.body.token;
    let created_at = req.body.created_at;
    let sender = req.body.sender;
    let fieldGroupAgent = req.body.terminalID || ""
    let msgObj = {};


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
        fields: [
            {
                id: JENDEK_GROUP_AGENT_FIELDID,
                value: fieldGroupAgent.replace(/[^a-zA-Z0-9\-]/g,'_').toLowerCase()
            }
        ],
        allow_channelback: true
    }
    externalRsrc.push(msgObj);
    msgObj = {};
    externalRsrcs = {
        instance_push_id: instance_push_id,
        external_resources: externalRsrc
    }

    var pushJendekUrl = 'https://' + JENDEK_DOMAIN + '.zendesk.com/api/v2/any_channel/push.json';

    logger.info("Calling " + pushJendekUrl + " Authorization: Bearer " + token_push + " Body: " + JSON.stringify(externalRsrcs))
    request({
        url: pushJendekUrl,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token_push
        },
        time: true,
        json: externalRsrcs
    }, function (err, newRes) {
        if (err) {
            logger.error(err)
            return res.status(500).send({
                error: "error",
                traceId: httpContext.get("traceId")
            });
        }

        logger.info("Called " + pushJendekUrl + " " + JSON.stringify({statusCode: newRes.statusCode, elapsedTime: newRes.elapsedTime + " ms", responseBody: newRes.body}));        
        if (newRes.statusCode == 200) {
            res.status(200).send({
                external_id: jendekExternalId,
                response: newRes["status"]
            });
        } else {
            res.status(newRes.statusCode).send({
                error: "error",                
                traceId: httpContext.get("traceId")
            })
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
        url: "http://" + WA_MEDIA_URL + "/api/wa/v1/media/get",
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
        logger.info(newRes.body)
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
        let imageData = newRes.body

        let imageUploadUrl = ''

        const uploadImageRequest = {
            method: "POST",
            url: "http://" + WA_URL + "/api/wa/v1/media/upload",
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
                logger.error(err)
            }
            logger.info(uploadRes)
            logger.info(body)
            res.status(200).send(uploadRes)
        });
    })
})

router.post('/integration/channelback', async (req, res, next) => {
    logger.info("RequestBody: " + JSON.stringify(req.body));
    let metadata = JSON.parse(req.body['metadata'])    
    // let push_id = metadata.instance_push_id
    // let token_id = metadata.token_id
    let to = req.body.thread_id.split("-")[2]

    if (!req.body["file_urls[]"]) {
        logger.info("request has no file urls")

        let url = "http://" + WA_URL + "/api/wa/v1/text/send"
        let json = {
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

        logger.info("Calling " + url + " Body: " + JSON.stringify(json))
        request({
            url,
            method: 'POST',
            json
        }, function (error, chatRes) {
            if (error) {
                logger.error(error)
                return res.status(500).send({
                    error: "error",
                    traceId: httpContext.get("traceId")
                });
            }

            logger.info("Called " + url + " " + JSON.stringify({statusCode: chatRes.statusCode, elapsedTime: chatRes.elapsedTime + " ms", responseBody: chatRes.body}));                        
            if (chatRes.body && chatRes.body.statusCode == "00") {
                res.status(200).send({...chatRes.body, external_id: chatRes.body.transactionRefNo});
            } else {
                res.status(500).send({
                    error: "error",
                    traceId: httpContext.get("traceId")                    
                });
            }
        });
    } else {
        logger.info("request has file urls")
        // let fileUrl = req.body["file_urls[]"] instanceof Array ? req.body["file_urls[]"][0] : req.body["file_urls[]"]
        let fileUrl = ''
        let fileUrls = req.body["file_urls[]"]
        let urls = fileUrls instanceof Array ? fileUrls : [fileUrls]
        logger.info("file_urls: " + JSON.stringify(urls))

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
            var uri = "http://" + WA_URL + '/api/wa/v1/media/upload' 
            var uploadMedia = {
                method: 'POST',
                uri: uri,
                formData: formData,
            };
            logger.info("Calling " + uri)
            let uploadRes = await requestPromise(uploadMedia)
            let uploadResponse = JSON.parse(uploadRes)
            logger.info("Called " + uri + " Response: " + JSON.stringify(uploadResponse))
            if (uploadResponse.statusCode == "00") {
                let uploadId = uploadResponse.media[0].id
                
                logger.info("UploadId: " + uploadId)

                let imgCaption = ''
                if ((i+1) == urls.length) {
                    imgCaption = req.body.message
                } else {
                    imgCaption = ''
                }
                var url = "http://" + WA_URL + "/api/wa/v1/media/send" 
                var json = {
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
                var sendMessage = {
                    url: url,
                    method: 'POST',
                    json: json
                }

                logger.info("Calling " + url + " Body: " + JSON.stringify(json))
                let chatResponse = await requestPromise(sendMessage)
                logger.info("Called " + url + " Response: " + JSON.stringify(chatResponse))
                if ((i+1) == urls.length) {
                    if (chatResponse.statusCode == "00") {
                        res.status(200).send({...chatResponse, external_id: chatResponse.transactionRefNo});
                    } else {
                        logger.error(JSON.stringify(chatResponse))
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
    logger.info(JSON.stringify(req.body))
    res.status(200).send({
        error: "system is not ready"
    });
})

function generateFileUrl (mediaId, channel) {
    let url = "https://" + CIF_HOST + "/jendek/getmedia/" + mediaId + "/" + channel + "/image.jpeg"
    return url
}

router.get('/test123',async (req, res, next) => {
    let newFileUrl = 'https://bcafinancehelp1569566623.zendesk.com/attachments/token/AWaDM8Dv2HQsSLw16UOWxfZgt/?name=dios_main_logo.jpg'
    logger.info('getting image');
    // request.get(newFileUrl, async function (err, responseFile, bodyFile) {
    //     logger.info(JSON.stringify(responseFile));
        // console.log(responseFile)
        // var formData = {
        //     mediaType: "image",
        //     file: bodyFile,
        //     channelID: 102,
        //     terminalID: 100,
        //     customerRefNo: '999999999',
        //     sender: 'FINANCE'
        // }
        // var uri = "http://" + WA_URL + '/api/wa/v1/media/upload' 
        // var uploadMedia = {
        //     method: 'POST',
        //     uri: uri,
        //     formData: formData,
        // };
        // // console.log(formData)
        // logger.info("Calling " + uri)
        // try {
        //     let uploadRes = await requestPromise(uploadMedia)
        //     let uploadResponse = JSON.parse(uploadRes)
        //     logger.info("Called " + uri + " Response: " + JSON.stringify(uploadResponse))
        //     res.status(200).send(uploadResponse)
        // } catch (error) {
        //     console.log(error)
        // }
    // })
    axios.get(newFileUrl).then(response => {
        // logger.info(response.data); // Blank
        logger.info(response.status); // False 
        logger.info(response.data);
        // console.log(base64.encode(response.data)); // Blank
    }).catch(err => logger.info(err));
})

module.exports = router;
