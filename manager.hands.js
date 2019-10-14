let Manager = require('./manager')

module.exports = class HandsManager extends Manager {
    constructor(opts) {
        let bt = new (require('./serial.direct'))({
            name: opts.name,
            baudRate: 9600,
            logger: opts.logger,
            dev: '/dev/ttyHANDS'
        });

        let ref = opts.fb.db.ref('museum/devices/hands')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // hookup bulb handling
        this.bulbs = new (require('./bulbs'))({ logger: opts.logger, fb:opts.fb })

        // setup supported commands
        handlers['hands.reboot'] = (s,cb) => { 
            bt.write('reboot');
            cb();
        }
        handlers['hands.toggle'] = (s,cb) => { 
            bt.write('mock');

            // optimistic update to db, so it doesn't flip back and forth
            ref.update({ mock: !this.mock })

            cb();
        }

        // setup supported device output parsing
        incoming.push(
        {
            pattern:/.*status=(.*)/,
            match: (m) => {
                m[1].split(',').forEach((s)=> {
                    let p = s.split(/:(.+)/);
                    switch(p[0]) {
                        case "solved": 
                            this.solved = (p[1] === 'true')
                            break
                        case "version": 
                            this.version = p[1]
                            break
                        case "gitDate": 
                            this.gitDate = p[1]
                            break 
                        case "buildDate": 
                            this.buildDate = p[1]
                            break
                        case "touching": 
                            this.touching = (p[1] === 'true')
                            break
                        case "mock": 
                            this.mock = (p[1] === 'true')
                            break
                    }
                })

                if (this.touching && this.bulbs.isWhite) {
                    this.bulbs.on();
                } else if (!this.touching && !this.bulbs.isWhite) {
                    this.bulbs.off();
                }

                ref.child('info/build').update({
                    version: this.version,
                    date: this.buildDate,
                    gitDate: this.gitDate
                })

                ref.update({
                    touching: this.touching,
                    mock: this.mock
                })
            }
        });

        this.ref = ref
        this.serial = bt
        this.logger = opts.logger

        this.touching = false
        this.mock = false
        this.version = "unknown"
        this.gitDate = "unknown"
        this.buildDate = "unknown"
    }

    touchChanged() {

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