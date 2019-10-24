let Manager = require('./manager')

module.exports = class BirdManager extends Manager {
    constructor(opts) {
        let incoming = [];
        let handlers = {};

        let ref = opts.fb.db.ref('museum/devices/bird')

        super({ 
            ...opts,
            ref: ref,
            dev:'/dev/ttyBIRD',
            baudRate: 115200,
            handlers: handlers,
            incoming:incoming,
        })

        // ask for status once we connect
        this.on('connected', () => {
            this.write('status')
        });

        // setup supported commands
        handlers['bird.open'] = (s,cb) => {
            this.write('solve', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.close'] = (s,cb) => {
            this.write('close', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.back'] = (s,cb) => {
            this.write('back', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.forward'] = (s,cb) => {
            this.write('forward', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.light'] = (s,cb) => {
            this.write('light', err => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.reboot'] = (s,cb) => {
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
                            case "lightValue": 
                                this.lightValue = parseInt(p[1])
                                break
                            case "isLight": 
                                this.isLight = (p[1] === 'true')
                                break
                            case "trayOpened": 
                                this.trayOpened = (p[1] === 'true')
                                break
                            case "password": 
                                this.password = p[1]
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
                        lightValue: this.lightValue,
                        isLight: this.isLight,
                        trayOpened: this.trayOpened,
                        password: this.password
                    })
                }
            });

        this.version = "unknown"
        this.gitDate = "unknown"
        this.buildDate = "unknown"

        this.solved = false
        this.trayOpened = false
        this.lightValue = 0
        this.isLight = true
        this.password = ""

        // now connect to serial
        this.connect()
    }
}
