# Installation
```sh
yarn add https://github.com/Clonex/WBSparser.git
```

# Example usage
```javascript
import WB from "wbsparser";

(async function() {
    const WBS = new WB();
    await WBS.login("Username", "Password");
    const data = await WBS.fragtbrevInfo("AA000000");
    console.log("Got data", data);
})();
```