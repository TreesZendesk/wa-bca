var rp = require('request-promise');

main()
    .then(text => {
        console.log(text);
    })
    .catch(err => {
        console.log(err)
    });

async function main(){
    console.log(new Date().toISOString())
    for (var i = 0; i < 200; i++) {
        let externalRsrcs = {
            "instance_push_id": "b004eae2-1793-4068-9bb0-a52372b9655a",
            "external_resources": [
                {
                    "external_id": "wa-msg-healthchecktessnew"+i+"-FINANCE",
                    "message": "Stress Test: " + i,
                    "thread_id": "wa-conv-6282219111105-FINANCE",
                    "created_at": new Date().toISOString(),
                    "author": {
                        "external_id": "wa-user-6282219111105",
                        "name": "Sinyo Malmsteen Baskoro"
                    },
                    "allow_channelback": true
                }
            ]
        }

        let config = {
            url: "https://bcafinancehelp1569566623.zendesk.com/api/v2/any_channel/push",
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + "fe6067830d6e19269d469a09bef6aa576ff097ef0ab62b7386da720b1e5964cf"
            },
            resolveWithFullResponse: true,  
            json: externalRsrcs
        }

        let response = await rp(config)
        console.log(i + " status: " + response.statusCode)
    }
}
