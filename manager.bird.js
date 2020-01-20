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

        this.db = opts.fb.db
        this.run = opts.run
        this.forced = false

        // ask for status once we connect
        this.on('connected', () => {
            this.write('status')
        });

        // setup supported commands
        handlers['bird.open'] = (s,cb) => {
            this.forced = true
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
                                    this.run.birdSolved(this.forced)
                                }
                                this.solved = _solved
                                break
                            case "lightValue": 
                                this.lightValue = parseInt(p[1])
                                break
                            case "isLight": 
                                this.isLight = (p[1] === 'true')
                                break
                            case "darkDetection":
                                this.darkDetection = (p[1] === 'true')
                                break
                            case "trayOpened": 
                                this.trayOpened = (p[1] === 'true')
                                break
                            case "password": 
                                this.password = p[1]
                                break
                        }

                        // special case for empty password
                        if (p[0] == 'password:' && !p[1]) {
                            this.password = ''
                        }
                    })

                    this.initialStatusReceived = true
    
                    ref.child('info/build').update({
                        version: this.version,
                        date: this.buildDate,
                        gitDate: this.gitDate
                    })
    
                    ref.update({
                        solved: this.solved,
                        lightValue: this.lightValue,
                        isLight: this.isLight,
                        darkDetection: this.darkDetection,
                        trayOpened: this.trayOpened,
                        password: this.password
                    })
                }
            });

        this.version = "unknown"
        this.gitDate = "unknown"
        this.buildDate = "unknown"

        this.initialStatusReceived = false
        this.solved = false
        this.trayOpened = false
        this.lightValue = 0
        this.isLight = true
        this.darkDetection = true
        this.password = ""

        // listen for hands, and disable dark detection
        this.db.ref('museum/devices/hands').on('value', (snapshot) => {

            // ignore this if we haven't receieved for status
            if (!this.initialStatusReceived) return

            let hands = snapshot.val()
            if (hands == null) return

            if ((hands.touching || hands.toggle) && this.darkDetection) {
                this.logger.log(this.logPrefix + 'hands detected.  disabling dark detection...')
                // need to flip the bit otherwise we can get into race with toggling
                this.darkDetection = false
                clearTimeout(this.enableDarkDetectionTimer)
                this.write('darkDetect')
            }

            if (!hands.touching && !hands.toggle && !this.darkDetection) {
                this.logger.log(this.logPrefix + 'hands not touching.  enabling dark detection...')
                this.darkDetection = true
                this.enableDarkDetectionTimer = setTimeout(() => {
                    this.logger.log(this.logPrefix + 'waited long enough for lights to come back, sending darkDetect cmd.')
                    this.write('darkDetect')
                }, 10000);
            }
        })

        // now connect to serial
        this.connect()
    }
}
