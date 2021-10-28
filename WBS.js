import convert  from "xml-js";
import request from "request";

import {stripSlashes, subKey, envelope, cleanObj, zeroPad, pad} from "./helpers.js";
const req = request;//.defaults({'proxy':'http://192.168.1.111:8888'});

export default class WBS {
    constructor()
    {
      this.sessionKey = false;
    }
    
    /*
     * Signs into WBS, and gets the sessionKey.
     */
    async login(username, password)
    {
      let data = await this.request(envelope("LogonEx2", "urn:uuid:7714ecb0-3034-483f-be54-194cfa56ecc0", {
        username,
        password,
        clientVersion: "2.22.4.1753 (ClickOnce deployet)"
      }));
      //console.log(data);
      this.sessionKey = data['LogonEx2Response']['LogonEx2Result']['SessionKey'];
      //console.log("Got sessionKey", this.sessionKey);
      return true;
    }

    /*
     * Gets all general info (Users, Routes etc).
     */
    async getBaseInfo()
    {
      let data = await this.request(envelope("GetChanges", "urn:uuid:396d3040-035f-4006-8d3a-8b8bff344821", {
        token: this.sessionKey
      }));
      return data.GetChangesResponse.GetChangesResult;
    }

    /*
     * Gets PDA logs.
     */
    async getLogs(messageIds = [])
    {
      let data = await this.request(envelope("GetLogs", "urn:uuid:72d852e0-19a8-42ab-9333-7e708c8da06c", {
        token: this.sessionKey,
        type: "Booking",
        messageIds: {
          attributes: {
            "xmlns:b": "http://schemas.microsoft.com/2003/10/Serialization/Arrays",
            "xmlns:i": "http://www.w3.org/2001/XMLSchema-instance"
          },
          content: messageIds.map(d => `<b:string>${d}</b:string>`).join("\n")
        },
        searchInArchive: "false",
        target: "Disponent"
      }));
     return data.GetLogsResponse && data.GetLogsResponse.GetLogsResult && data.GetLogsResponse.GetLogsResult.SharedAuditLog ? data.GetLogsResponse.GetLogsResult.SharedAuditLog : [];
    }

    /*
     * Gets a list of tasks assigned to a driver.
     */
    async getTasks(id = "82808913", time = Date.now())
    {
      let baseDate = new Date(time);
      let dateMonth = baseDate.getMonth() + 1;
      dateMonth = dateMonth < 10 ? "0" + dateMonth : dateMonth
      let dateDay = baseDate.getDate() < 10 ? "0" + baseDate.getDate() : baseDate.getDate();
      let currDate = `${baseDate.getFullYear()}-${dateMonth}-${dateDay}T00:00:00`;
      
      let data = await this.request(envelope("GetOpgaveListeByChauffoer", "urn:uuid:ff219188-7d24-4fec-9b13-0bdff2d31387", {
        token: this.sessionKey,
        chauffoer: id,
        selectedDate: currDate
      }));
      let base = data['GetOpgaveListeByChauffoerResponse'] ? data['GetOpgaveListeByChauffoerResponse']['GetOpgaveListeByChauffoerResult']['OpgaveListe'] : [];
      return base;
    }

    /*
     * Converts unix to server time stamp. (YYYY-MM-DDTHH:mm:ss.sss)
     */
    unixToStamp(unix = Date.now())
    {
      const x = new Date(unix);
      return x.toISOString();
      //return x.getFullYear() + "-" + zeroPad(x.getMonth() + 1) + "-" + zeroPad(x.getDate()) + "T" + zeroPad(x.getHours() - 1) + ":" + zeroPad(x.getMinutes()) + ":" + zeroPad(x.getSeconds()) + ":" + x.getMilliseconds() + ".0000000+01:00";
    }

    /*
     * Gets geopositions of a driver in a given interval.
     */
    async geoPositions(driver = "82808963", start = "2019-10-02T22:29:05.6508137+01:00", end = "2020-01-02T23:44:05.6508137+01:00")
    {
      let ret = [];
      let page = 0;
      let justStarted = true;
      let data;
      while((justStarted || data.GetGeopositionsResponse.GetGeopositionsResult.NextPageId !== undefined) && page < 2000)
      {
        console.log("Getting page", page, "Data size", ret.length);
        data = await this.request(envelope("GetGeopositions", "urn:uuid:76b787f3-b1ea-4d3e-9236-c9ad05490224", {
          token: this.sessionKey,
          startTime: start,
          endTime: end,
          ident: driver,
          posType: "Driver",
          pageId: page > 0 ? page : {
            attributes: {
              "i:nil": "true",
              "xmlns:i": "http://www.w3.org/2001/XMLSchema-instance"
            }
          },
        }));
        
        if(data && data.GetGeopositionsResponse && data.GetGeopositionsResponse.GetGeopositionsResult.Positions && data.GetGeopositionsResponse.GetGeopositionsResult.Positions.ModelGeoPosition)
        {
          let newData = data.GetGeopositionsResponse.GetGeopositionsResult.Positions.ModelGeoPosition;
          if(!Array.isArray(newData))
          {
            newData = [newData];
          }
          ret = [
            ...ret,
            ...newData
          ];
        }else{
          break;
        }
        page++;
        justStarted = false;
      }
     return ret;
    }

    /*
     * Gets information about a given delivery.
     */
    async fragtbrevInfo(fragtbrevnummer = "VR375676")
    {
      let data = await this.request(envelope("GetBookingFromFbNr", "urn:uuid:e0af1a68-e0b2-48aa-bd96-221ec19b6d93", {
        token: this.sessionKey,
        fragtbrevnummer
      }));
     return Object.keys(data).length > 0 ? data['GetBookingFromFbNrResponse']['GetBookingFromFbNrResult'] : false;
    }

    /*
     * Gets the full information about a given delivery.
     */
    async fullFragtbrevInfo(fragtbrevsNummer = "VR375676")
    {
      let data = await this.request(envelope("FindFragtbrevIWSCom", "urn:uuid:7b819646-8e72-4aac-a089-2b2e0fbebc9e", {
        token: this.sessionKey,
        fragtbrevsNummer
      }));
     return Object.keys(data).length > 0 ? data['FindFragtbrevIWSComResponse']['FindFragtbrevIWSComResult'] : false;
    }

    /*
     * Searches the booking system.
     */
    async bookingSearch(term)
    {
      let data = await this.request(envelope("BookingSearch", "urn:uuid:5650b00a-470a-42fb-b5a1-cecb9792d6bf", {
        token: this.sessionKey,
        fritekst: term,
        maxResults: 101,
        searchInArchive: "true",
      }));
      
      let base = data['BookingSearchResponse']['BookingSearchResult']['b:Transport'];
      let bestInfo = base['Bestiller'];
      let destInfo = base['Modtager'];
      let ret = {
        kunde: subKey("FirmaNavn", destInfo),
        addresse: subKey("Adresse", destInfo),
        zip: subKey("Postnummer", destInfo),
        gps: {
          lat: subKey("Lat", destInfo),
          long: subKey("Lon", destInfo),
        },
      };
      return ret;
    }

    /*
     * Creates and parses the weird request used by the server.
     */
    async request(reqData, compact = true)
    {
      reqData = reqData.split("\n").join("").trim();
      let uuid = "58821bff-1446-4d5a-a7ab-11630aca4e58";
      let data = await new Promise(r => req({
        'method': 'POST',
        'url': 'http://wbs.fragt.dk/WBS-Service/WBSService.svc',
        'headers': {
          'Content-Type': ` multipart/related; type="application/xop+xml";start="<http://tempuri.org/0>";boundary="uuid:${uuid}+id=1";start-info="application/soap+xml"`
        },
        body: `--uuid:${uuid}+id=1\r\nContent-ID: <http://tempuri.org/0>\r\nContent-Transfer-Encoding: 8bit\r\nContent-Type: application/xop+xml;charset=utf-8;type=\"application/soap+xml\"\r\n\r\n${reqData}\r\n--uuid:${uuid}+id=1--`
      
       }, (err, res, body) => {
        if (err) { return console.log(err); }
        body = body.split("\n");
        let bodyFix = body;
        let start = null;
        let end = null;
        for(let i = 1; i < body.length; i++)
        {
          let curr = body[i];
          if(curr.length <= 1)
          {
            if(!start)
            {
              start = i;
            }else{
              end = i;
            }
          }
        }
        r(
          body.map(d => d.trim()).filter((d, k) => start && end ? k > start && k < end - 1 : true).filter(d => d.length > 1).join("")
        );
      }));
      let xml = stripSlashes(data);
      let json = JSON.parse(convert.xml2json(xml, {compact, spaces: 1}));
      return cleanObj(json['s:Envelope']['s:Body']);
       
    }
}