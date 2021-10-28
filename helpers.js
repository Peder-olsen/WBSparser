// https://trace.fragt.dk/#/trackTrace/CQ895431
export function stripSlashes(val){
    return val.replace(/\\(.)/mg, "$1");
}

export function subKey(key, obj, subkey = "_text")
{
    return obj[key][subkey];
}

export function zeroPad(val)
{
    return pad(val, "0", 2);
}

export function startOfDay(now = new Date())
{
    return (new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function pad(value, padding, length, front = true){
    let temp = value;
    while(temp.length < length)
    {
        temp = front ? `${padding}${temp}` : `${temp}${padding}`;
    }
    return temp;
}

export function envelope(type = "LogonEx2", messageID = "urn:uuid:7714ecb0-3034-483f-be54-194cfa56ecc0", data = {})
{
    let content = Object.keys(data).map(key => {
        let startKey = key;
        let d = data[key];
        if(typeof d === "object")
        {
            startKey += " " + Object.keys(d.attributes).map(key => `${key}="${d.attributes[key]}"`).join(" ");
            if(!d.content)
            {
                return `<${startKey}/>`;
            }
            d = d.content;
        }
        return `<${startKey}>${d}</${key}>`;
    }).join("\n");
    return `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">
        <s:Header>
            <a:Action s:mustUnderstand="1">http://tempuri.org/IWBSService/${type}</a:Action>
            <a:MessageID>${messageID}</a:MessageID>
            <a:ReplyTo>
                <a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>
            </a:ReplyTo>
            <a:To s:mustUnderstand="1">http://wbs.fragt.dk/WBS-Service/WBSService.svc</a:To>
        </s:Header>
        <s:Body>
            <${type} xmlns="http://tempuri.org/">
                ${content}
            </${type}>
        </s:Body>
    </s:Envelope>`;
}

export function query(statement, connection, WHERE = []) {
    return new Promise(r => connection.query(statement, WHERE, (error, results, fields) => {
        if(error)
        {
            console.log("[MySQL error]", error);
        }
        r({error, results, fields});
    }));
}

export async function mapLimiter(arr, mapFunc, delay = 10)
{
    return await new Promise(r => {
        let arrI = 0;
        let done = arr.map(d => false);
        let getData = async (i) => {
            try {
                arr[i] = await mapFunc(arr[i]);
            } finally {
                done[i] = true;
            }
            if(!done.some(d => !d))
            {
                r(arr);
            }
        };
        let int = setInterval(() => {
            if(arrI < arr.length)
            {
                getData(arrI);
                arrI++;
            }else{
                clearInterval(int);
            }
        }, delay);
    });
}

export function cleanObj(obj)
{
    let keys = Object.keys(obj);
    for(let i = 0; i < keys.length; i++)
    {
        let key = keys[i];
        let curr = obj[key];
        if(typeof curr == "object")
        {
            let isArr = Array.isArray(curr);
            if(isArr)
            {
                obj[key] = curr.map(d => cleanObj(d));
            }else{
                obj[key] = cleanObj(curr);
                let newKeys = Object.keys(curr);
                if(newKeys.length == 1 && newKeys.includes("_text"))
                {
                    obj[key] = obj[key]._text;
                }
                if(newKeys.length == 0 || obj[key] === undefined)
                {
                    delete obj[key];
                }
            }
        }
        if(key[1] === ":")
        {
            let temp = obj[key];
            delete obj[key];
            obj[key.substring(2, key.length)] = temp;
        }
    }
    if(obj._attributes)
    {
        delete obj._attributes;
    }

    return obj;
}