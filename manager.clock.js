let Manager = require('./manager')

module.exports = class ClockManager extends Manager {
    constructor(opts) {

        let bt = new (require('./serial.direct'))({
            name: opts.name,
            baudRate: 115200,
            logger: opts.logger,
            dev: '/dev/ttyCLOCK'
        });

        let ref = opts.fb.db.ref('museum/devices/clock')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // setup supported commands
        handlers['clock.open'] = (s,cb) => {
            bt.write('solve', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.motor'] = (s,cb) => {
            bt.write('motor', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.reboot'] = (s,cb) => {
            bt.write('reboot', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        // setup supported device output parsing
        incoming.push(
            {
                pattern:/.*status=(.*)/,
                match: (m) => {
                    m[1].split(',').forEach((s)=> {
                        let p = s.split(/:(.+)/);
                        switch(p[0]) {
                            case "version": 
                                this.version = p[1]
                                break
                            case "gitDate": 
                                this.gitDate = p[1]
                                break 
                            case "buildDate": 
                                this.buildDate = p[1]
                                break
    
                            case "solved": 
                                this.solved = (p[1] === 'true')
                                break
                            case "hs": 
                                this.hs = (p[1] === 'true')
                                break
                            case "ms": 
                                this.ms = (p[1] === 'true')
                                break
                            case "stepper": 
                                this.motor = (p[1] === 'true')
                                break
                        }
                    })
    
                    ref.child('info/build').update({
                        version: this.version,
                        date: this.buildDate,
                        gitDate: this.gitDate
                    })
    
                    ref.update({
                        solved: this.solved,
                        hs: this.hs,
                        ms: this.ms,
                        motor: this.motor
                    })
                }
            });

        this.db = opts.fb.db
        this.ref = ref
        this.serial = bt
        this.logger = opts.logger

        this.solved = false
        this.hs = false
        this.ms = false
        this.motor = false

        // listen for cabinet opening, and then turn on our motor
        this.db.ref('museum/devices/cabinet').on('value', (snapshot) => {
            let cabinet = snapshot.val()
            if (cabinet == null) return

            if (bt.isOpen() && this.cabinet.info.isConnected && cabinet.solved && !this.solved && !this.motor) {
                this.logger.log(this.logPrefix + 'cabinet open detected.  turning on clock motor...')
                this.db.ref('museum/operations').push({ command: 'clock.motor', created: (new Date()).getTime()});
            }
        })
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
        this.bt.write('status')

        this.ref.child('info').update({
            isConnected: true,
            lastActivity: (new Date()).toLocaleString()
        })
    }
}