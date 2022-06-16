# WBSparser
Blev originalt lavet til at trække data ud fra WBS-programmet. Men er senere blevet udvidet til at trække data ud fra:
- WBS
- DFMobil
- Turplan
- Webfragt

## Installation
```sh
yarn add https://github.com/Peder-olsen/WBSparser.git
```

## Example usage
```javascript
import WB from "wbsparser";

(async function() {
    const WBS = new WB();
    await WBS.login("Username", "Password");
    const data = await WBS.fragtbrevInfo("AA000000");
    console.log("Got data", data);
})();
```
