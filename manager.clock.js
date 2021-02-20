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

        this.db = opts.fb.db
        this.logger = opts.logger
        this.run = opts.run
        this.forced = false

        // ask for status once we connect
        this.on('connected', () => {
            this.write('status')
        });

        // setup supported commands
        handlers['clock.open'] = (s,cb) => {
            this.forced = true
            this.write('solve', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.encoder'] = (s,cb) => {
            this.write('encoder', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.hour']    = (s,cb) => { this.write('hour',    err => { if (err) { s.ref.update({ 'error': err }); } cb() }); }
        handlers['clock.hourDec'] = (s,cb) => { this.write('hourDec', err => { if (err) { s.ref.update({ 'error': err }); } cb() }); }
        handlers['clock.minute']  = (s,cb) => { this.write('minute',  err => { if (err) { s.ref.update({ 'error': err }); } cb() }); }
        handlers['clock.minDec']  = (s,cb) => { this.write('minDec',  err => { if (err) { s.ref.update({ 'error': err }); } cb() }); }

        handlers['clock.reboot'] = (s,cb) => {
            this.forced = false
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
                                let _solved = (p[1] === 'true')
                                if (_solved && !this.solved) {
                                    this.run.clockSolved(this.forced)
                                }   
                                this.solved = _solved
                                break
                            case "hs": 
                                this.hs = (p[1] === 'true')
                                break
                            case "ms": 
                                this.ms = (p[1] === 'true')
                                break
                            case "hourMotor": 
                                this.hourMotorPos = p[1]
                                break;
                            case "minuteMotor": 
                                this.minMotorPos = p[1]
                                break;
                            case "encoder": 
                                this.encoder = (p[1] === 'true')
                                break;
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
                        hourMotorPos: this.hourMotorPos,
                        minMotorPos: this.minMotorPos,
                        encoder: this.encoder,
                    })
                }
            });

        this.solved = false
        this.hs = false
        this.ms = false
        this.hourMotorPos = 0
        this.minMotorPos = 0
        this.encoder = true

        // now connect to serial
        this.connect()
    }
}