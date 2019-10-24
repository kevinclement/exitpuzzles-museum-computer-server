let Manager = require('./manager')

module.exports = class ClockManager extends Manager {
    constructor(opts) {
        let incoming = [];
        let handlers = {};

        let ref = opts.fb.db.ref('museum/devices/clock')

        super({ 
            ...opts,
            ref: ref,
            dev:'/dev/ttyCLOCK',
            baudRate: 115200,
            handlers: handlers,
            incoming:incoming,
        })

        // ask for status once we connect
        this.on('connected', () => {
            this.write('status')
        });

        // setup supported commands
        handlers['clock.open'] = (s,cb) => {
            this.write('solve', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.motor'] = (s,cb) => {
            this.write('motor', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.reboot'] = (s,cb) => {
            this.write('reboot', err => {
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
        this.logger = opts.logger

        this.solved = false
        this.hs = false
        this.ms = false
        this.motor = false

        // listen for cabinet opening, and then turn on our motor
        this.db.ref('museum/devices/cabinet').on('value', (snapshot) => {
            let cabinet = snapshot.val()
            if (cabinet == null) return

            if (cabinet.solved && !this.solved && !this.motor) {
                this.logger.log(this.logPrefix + 'cabinet open detected.  turning on clock motor...')
                this.db.ref('museum/operations').push({ command: 'clock.motor', created: (new Date()).getTime()});
            }
        })

        // now connect to serial
        this.connect()
    }
}