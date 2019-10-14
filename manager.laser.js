let Manager = require('./manager')

module.exports = class LaserManager extends Manager {
    constructor(opts) {

        // Bluetooth device name: ExitMuseumLaser
        let bt = new (require('./serial.bluetooth'))({
            name: opts.name,
            address: '3C:71:BF:83:D8:76',
            channel: 1,
            logger: opts.logger
        });

        let ref = opts.fb.db.ref('museum/devices/laser')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // setup supported commands
        handlers['laser.enable'] = (s,cb) => {
            bt.write('enable', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                } else {
                    // toggle db here so we don't bounce the ui waiting for the output
                    ref.update({ enabled: true })
                }
                cb()
            });
        }
        handlers['laser.disable'] = (s,cb) => { 
            bt.write('disable', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                } else {
                    // toggle db here so we don't bounce the ui waiting for the output
                    ref.update({ enabled: false })
                }
                cb()
            });
        }

        // setup supported device output parsing
        incoming.push(
        {
            pattern:/.*turning on laser.*/,
            match: (m) => {
                ref.update({ enabled: true })
            }
        },
        {
            pattern:/.*turning off laser.*/,
            match: (m) => {
                ref.update({ enabled: false })
            }
        });

        this.ref = ref
        this.serial = bt
        this.logger = opts.logger

        this.enabled = false
    }
    
    activity() {
        this.ref.child('info').update({
            lastActivity: (new Date()).toLocaleString()
       })
    }

   connecting() {
       // NOTE: while connecting, mark device as disabled, since it defaults to that
       this.ref.child('info').update({
           isConnected: false
       })
   }

   connected() {
       this.ref.child('info').update({
           isConnected: true,
           lastActivity: (new Date()).toLocaleString()
       })
    }
}