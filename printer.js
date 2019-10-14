const path = require('path');
const escpos = require('escpos');

const options = { }
const device  = new escpos.USB();
const printer = new escpos.Printer(device, options);

let img = undefined;
const solvedTicket = path.join(__dirname, 'zoltar-solved-ticket.jpg');
escpos.Image.load(solvedTicket, function(image){
    img = image;
})

module.exports = class Printer {
    constructor(opts) {
        this.logger = opts.logger
        this.logPrefix = 'printer: '
    }

    print(cb) {
        this.logger.log(this.logPrefix + 'printing solved ticket...')
        device.open(() => {
            printer
                .align('ct')
                .raster(img)
                .cut()
                .feed(5)
                .close()
        })
    }

    feed(cb) {
        this.logger.log(this.logPrefix + 'feeding paper...')
        device.open(() => {
            printer
                .feed(3)
            
            if (cb) { 
                cb()
            }
        })
    }
}
