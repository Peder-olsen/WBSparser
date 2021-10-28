import request from "request";
import fs from "fs";
import ThrottledPromise from "./ThrottledPromise.js";

export default class Webfragt {
    auth = false;
    
    async login(usr, pass)
    {
        let getToken = await this.baseRequest(
            "https://webfragt.fragt.dk/webfragt2/identity/connect/token", 
            "POST", 
            `client_id=apiclient&client_secret=21B5F798-BE55-42BC-8AA8-0025B903DC3B&username=${usr}&password=${pass}&grant_type=password&scope=ClientApi`
        );
        if(!getToken.err)
        {
            this.auth = getToken.body.access_token;
        }
    }

    stamp(unix = Date.now())
    {
        const date = new Date(unix);
        const realMonth = date.getMonth() + 1;
        const month = realMonth < 10 ? "0" + realMonth : realMonth;
        const day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
        return `${day}${month}${date.getFullYear()}`;
    }

    BATCH_SIZE = 500;
    async fragtbreveList(fragtbreve = [])
    {
        let ret = [];
        let rest = [...fragtbreve];
        while(rest.length > 0)
        {
            let currentBatch = rest.filter((_, key) => key < this.BATCH_SIZE);
            rest = rest.filter((_, key) => key >= this.BATCH_SIZE);

            const body = {
                "Fragtbrevsnumre": currentBatch.join(","),
                "Newfragtbrev":null,
                "ForceCheckBookingTime":false
            };
            let allFragts = await this.baseRequest(
                "https://webfragt.fragt.dk/webfragt2/clientapi/Fragtbrev/GetByFragtbrevsnumre", 
                "POST", 
                JSON.stringify(body),
                {
                    "Authorization": `Bearer ${this.auth}`,
                    "Content-Type": "application/json",
                }
            );
            allFragts = allFragts.err ? [] : allFragts.body;
            ret = [
                ...ret,
                ...allFragts
            ];
        }
        return ret;
    }

    async fragtBrevZips(zips = [], from = "25082020", to = "26082020")
    {
        const promiseQueue = new ThrottledPromise(3, 500);
        const IDs = ["NAT", "KRAN"];
        // Get all deliveries that contains our zips.
        zips.map(zip => promiseQueue.add(async () => await this.fragtbreve(zip, from, to)));
        let data = await promiseQueue.start();
        // Merge the lists, and filter the ones which is not being deliveres in our zips.
        data = data.reduce((a, b) => [...a, ...b], []).filter(brev => zips.includes(brev.Modtagerpostnr));
        let missing = data.map(brev => brev.Fragtbrevsnummer);
        let output = [];
        const batchSize = 500;
        while(missing.length > 0)
        {
            let currentBatch = missing.filter((_, key) => key < batchSize);
            missing = missing.filter((_, key) => key >= batchSize);
            const body = {
                "Fragtbrevsnumre": currentBatch.join(","),
                "Newfragtbrev":null,
                "ForceCheckBookingTime":false
            };
            let allFragts = await this.baseRequest(
                "https://webfragt.fragt.dk/webfragt2/clientapi/Fragtbrev/GetByFragtbrevsnumre", 
                "POST", 
                JSON.stringify(body),
                {
                    "Authorization": `Bearer ${this.auth}`,
                    "Content-Type": "application/json",
                }
            );
            allFragts = allFragts.err ? false : allFragts.body;
            output = [
                ...output,
                ...allFragts
            ];
        }
        const routes = ["222", "540", "306"];
        output = output.filter(brev => zips.includes(brev.Modtagerpostnr)).filter(brev => !routes.includes(brev.Rutefm1) && !routes.includes(brev.Rutefm2));
        output = output.filter(brev => !IDs.some(ID => brev.Servicekoder.includes(ID)));
        
        return output;
    }

    async fragtbrev(nr = "BI241486")
    {
        const trackTrace = await this.request(`tracktrace/GetTrackTrace?consignmentNumber=${nr}&language=1`);
        const scanned = await this.request(`tracktrace/GetScannedConsignmentNotes?consignmentNumber=${nr}`);
        const eta = await this.request(`tracktrace/GetEta?consignmentNumber=${nr}`);

        return {
            trackTrace,
            scanned,
            eta,
        };
    }

    async history(nr = "BI241486")
    {
        return this.request(`Fragtbrev/GetHistoryV2?fragtbrevsnummer=${nr}`);
    }

    /*
        23 - 24 = 2065 / 1872
        21 - 23 = 1347 / 1499
    */
    async fragtbreve(zip = 5000, from = "25082020", to = "26082020")
    {
        const pageSize = 250;
        let ret = [];
        let data = false;
        let i = 0;
        while(data === false || data.RecordCount > 0)
        {
            const page = i * pageSize;
            data = await this.request(
                `FragtbrevDigest/GetDigests?fromdate=${from}&todate=${to}&sort=Oprettet&sortdirection=DESC&searchtext=${zip}&statusfilter=&take=${pageSize}&skip=${page}&searchType=ConsignmentDate&searchElastic=true`
            );
            if(!data.FragtbrevDigests)
            {
                console.log("Digests not found", data);
            }
            ret = [
                ...ret,
                ...(data.FragtbrevDigests || [])
            ];
            i++;
        }
        return ret;
    }

    async request(url)
    {
        if(!this.auth)
        {
            console.error("Not signed in!");
            return;
        }
        url = "https://webfragt.fragt.dk/webfragt2/clientapi/" + url;
        //console.log(url);
        let resp = await this.baseRequest(url, "GET", undefined, {
            "Authorization": `Bearer ${this.auth}`
        });

        return resp.err ? false : resp.body;
    }

    async getPDF(id = "CS505635")
    {  
        const brevInfo = await this.request(`tracktrace/GetTrackTrace?consignmentNumber=${id}&language=1`);
        if(brevInfo)
        {
            let key = brevInfo.Key.Key;
            return `https://webfragt.fragt.dk/webfragt2/clientapi/tracktrace/GetScannedConsignmentNoteUrl?consignmentNumber=${id}&key=${key}&documentType=UnsignedConsignmentNote&contentId=${id}`;

        }
        return false;
    }

    async download(uri, filename){
        /*let headD = await this.baseRequest(uri, "HEAD", undefined, {
            "Authorization": `Bearer ${this.auth}`
        }, false);*/
        /*console.log('content-type:', headD.res.headers['content-type']);
        console.log('content-length:', headD.res.headers['content-length']);*/

        return new Promise(r => request({
            url: uri,
            headers: {
                "Authorization": `Bearer ${this.auth}`
            }
        }).pipe(fs.createWriteStream(filename)).on('close', r));
        return;

    }

    baseRequest(url, method = "GET", body, headers = {}, toJSON = true)
    {
        return new Promise(r => request({
            method,
            url,
            method,
            headers,
            body,
           }, (err, res, respBody) => {
               if(!err && toJSON)
               {
                   let tempB = respBody;
                   try {
                       respBody = JSON.parse(respBody);
                       
                   } catch (error) {
                    //    console.log("COuldnt parse JSON! :(", respBody, {
                    //     method,
                    //     url,
                    //     method,
                    //     headers,
                    //     body,
                    //    });
                    //    console.log(tempB, err);
                   }
               }
               r({err, res, body: respBody});
           }));
    }
}