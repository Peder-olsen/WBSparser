# WBSparser
Blev originalt lavet til at trække data ud fra WBS-programmet. Men er senere blevet udvidet til at trække data ud fra:
- [WBS](http://wbs.fragt.dk/wbs-app/welcome.htm)
- DFMobil
- [Turplan](https://turplan.fragt.dk/)
- [Webfragt](https://webfragt.fragt.dk/)

## Installation
```sh
yarn add https://github.com/Peder-olsen/WBSparser.git
```

## WBS eksempel
```javascript
import WB from "wbsparser";

const WBS = new WB();
await WBS.login("Username", "Password");
const data = await WBS.fragtbrevInfo("AA000000");
console.log("Got data", data);
```
