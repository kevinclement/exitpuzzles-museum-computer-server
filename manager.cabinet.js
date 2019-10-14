let Manager = require('./manager')

module.exports = class CabinetManager extends Manager {
    constructor(opts) {

        // Bluetooth device name: ExitMuseumCabinet
        let bt = new (require('./serial.bluetooth'))({
            name: opts.name,
            address: '3C:71:BF:84:D6:7A',
            channel: 1,
            logger: opts.logger
        });

        let ref = opts.fb.db.ref('museum/devices/cabinet')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // setup supported commands
        handlers['cabinet.open'] = (s,cb) => {
            bt.write('solve', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['cabinet.reboot'] = (s,cb) => {
            bt.write('reboot', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                } else {
                    // go ahead and update the db and let it know we're disconnected since we will time out
                    this.ref.child('info').update({ isConnected: false })

                    // tell blootooth to disconnecto make reconnect faster
                    setTimeout(() => {
                        bt.disconnect();
                    }, 10000) 
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
                        case "lights": 
                            this.lights = (p[1] === 'true')
                            break
                        case "magnet": 
                            this.magnet = (p[1] === 'true')
                            break    
                        case "idol": 
                            this.idol = parseInt(p[1]);
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
                    lights: this.lights,
                    magnet: this.magnet,
                    idol: this.idol
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
        this.lights = false
        this.magnet = false
        this.idol = 0
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