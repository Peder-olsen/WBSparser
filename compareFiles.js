import fs from "fs";
 
fs.readFile('DF1FM8.CSV', 'utf8', function(err, baseFile) {
    baseFile = baseFile.split("\r\n").map(line => line.split(";").map(line => line.substring(1, line.length - 1)));
    fs.readFile('26-08-fragtbreve-webfragt.json', 'utf8', function(err, webData) {
        webData = JSON.parse(webData);
        console.log("webData", webData);
        const notFound = baseFile.filter(line => !webData.some(web => web.isFull ? line[2] === web.ConsignmentNote.ConsignmentNumber : line[2] === web.Fragtbrevsnummer));
        console.log("Mismatch", notFound);
    });
});

setTimeout(() => {}, 100000*1000 );