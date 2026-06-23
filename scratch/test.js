const https = require('https');

https.get('https://photon.komoot.io/api/?q=Luc&limit=5&filter=countrycode:IN', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data.substring(0, 500));
  });
}).on('error', (err) => {
  console.log("Error:", err.message);
});
