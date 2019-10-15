let Manager = require('./manager')

module.exports = class BirdManager extends Manager {
    constructor(opts) {

        let bt = new (require('./serial.direct'))({
            name: opts.name,
            baudRate: 115200,
            logger: opts.logger,
            dev: '/dev/ttyBIRD'
        });

        let ref = opts.fb.db.ref('museum/devices/bird')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // setup supported commands
        handlers['bird.open'] = (s,cb) => {
            bt.write('solve', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.close'] = (s,cb) => {
            bt.write('close', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.back'] = (s,cb) => {
            bt.write('back', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.forward'] = (s,cb) => {
            bt.write('forward', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.play'] = (s,cb) => {
            bt.write('play', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.stop'] = (s,cb) => {
            bt.write('stop', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['bird.reboot'] = (s,cb) => {
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
                        case "lightValue": 
                            this.lightValue = parseInt(p[1])
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
                    trayOpened: this.trayOpened,
                    password: this.password
                })
            }
        });

        this.ref = ref
        this.serial = bt
        this.logger = opts.logger

        this.version = "unknown"
        this.gitDate = "unknown"
        this.buildDate = "unknown"

        this.solved = false
        this.trayOpened = false
        this.lightValue = 0
        this.password = ""
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
        this.bt.write('status');

        this.ref.child('info').update({
            isConnected: true,
            lastActivity: (new Date()).toLocaleString()
        })
    }
}
