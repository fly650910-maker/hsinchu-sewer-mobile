const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/fly/Downloads/下水道科/1.業務內容及分工/下水道科業務.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error){
    console.error(error);
});
