var d = new Date();

var str = (new Date()).toString()
console.log(`date: ${str}`);

const nDate = new Date().toLocaleString('en-US', {
  timeZone: 'America/Los_Angeles'
});
