import request from "request";


export default class Webfragt {
    _auth;
    
    async login(usr, pass)
    {
        const data = await this._req("auth/login", {
            "Username": usr,
            "Password": pass
        });
        if(data)
        {
            this._auth = data.AccessToken;
        } 
    }

    getFragtbrev(nr)
    {
        return this._req("Leverance/FindLeverance?fragtbrevsnummer=" + nr);
    }

    async ture(tomorrow = false)
    {
        return this._req("Tur/GetTure?_t=" + Date.now(), {
            "Fc": "",
            "Fragtbrevsnummer": null,
            "State": "Planning,Processing,LoadingStarted,LoadingFinished,Delivering",
            "ShowFutureDeliveries": tomorrow,
            "filteredDays": tomorrow ? 100 : 0,
            "searchValue": ""
        });
    }

    async getKolis()
    {
        const ture = (await Promise.all([
            this.ture(false),
            this.ture(true),
        ])).flat();
        let out = {};
        for(let i = 0; i < ture.length; i++)
        {
            const tur = ture[i];
            if(tur)
            {
                for(let j = 0; j < tur.Drops.length; j++)
                {
                    const FBids = tur.Drops[j].Leverancer.map(d => d.Fragtbrevsnummer).flat().flat();
                    const kolis = tur.Drops[j].Leverancer.map(d => d.Godslinjer).flat().map(d => d.Kollier).flat();
                    for(let k = 0; k < kolis.length; k++)
                    {
                        const koli = kolis[k];
                        const fbID = FBids[k];
                        const port = tur.PortRanke;
                        if(port)
                        {
                            let ranke = port.substring(0, 2);
                            ranke += " " + port.substring(2, 4);
                            ranke += " " + port.substring(4, 7);
                            ranke += " " + port.substring(7, 8);
                            ranke += " " + port.substring(8, 12);
                            out[koli.Kode] = ranke;

                            if(fbID)
                            {
                                out[fbID] = ranke;
                            }
                        }
                    }

                }
            }
        }

        return out;
    }

    // getDate()
    // {
    //     const temp = new Date();
    //     if(temp.getHours() >= 18)
    //     {
    //         temp.setDate(temp.getDate() + 1);
    //     }

    //     const startOfDay = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate());
    //     return startOfDay.getTime();
    // }

    _req(endpoint, body)
    {
        var options = {
            'method': body ? 'POST' : "GET",
            'url': 'https://turplan.fragt.dk/api/' + endpoint,
            'headers': {
                'Content-Type': ' application/json',
                Authorization: this._auth ? " Bearer " + this._auth : null
            },
            body: JSON.stringify(body)
        };
          
        return new Promise(r => request(options, (error, response) =>{
            if (error) r(false);
            try {
                r(JSON.parse(response.body));
            } catch (error) {
                r(false);
            }
        }));          
    }
};