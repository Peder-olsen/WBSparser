import request from "request";
import convert  from "xml-js";

import {cleanObj} from "./helpers.js";

export default class DFMobil {
    _key;
    _username;
    constructor(key, username)
    {  
        this._key = key;
        this._username = username;
    }
    
    async searchKoli(koli)
    {
        const data = await this.request("GetPortRankeInfo", `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:xsd="http://www.w3.org/2001/XMLSchema"
            xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <GetPortRankeInfo
                    xmlns="http://dfmobil.fragt.dk/">
                    <request>${koli}</request>
                    <userName>${this._username}</userName>
                    <fc>OD</fc>
                </GetPortRankeInfo>
            </soap:Body>
        </soap:Envelope>`);
        if(data)
        {
            return JSON.parse(data.GetPortRankeInfoResponse.GetPortRankeInfoResult);
        }

        return false;
    }

    request(action, body)
    {
        return new Promise(r => request({
            method: "POST",
            url: "http://mobildata.fragt.dk/DFMobilWebservice/DFMobil.asmx",
            headers: {
                "User-agent": "Mono Web Services Client Protocol 4.0.50524.0",
                "DFKey": this._key,
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"http://dfmobil.fragt.dk/' + action + '"',
                "Expect": "100-continue",
            },
            body
        }, (err, res, body) => {
            if(err)
            {
                r(false);
            }else{
                let json = JSON.parse(convert.xml2json(body, {compact: true, spaces: 1}));
                r(cleanObj(json['soap:Envelope']['soap:Body']));
            }
        }));
    }
}