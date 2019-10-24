const EventEmitter = require('events');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const Delimiter = require('@serialport/parser-delimiter')

module.exports = class Manager extends EventEmitter {
    constructor(opts) {
        super()
        this.logger = opts.logger
        this.port = new SerialPort(opts.dev, { baudRate:opts.baudRate, autoOpen:false });
        this.handlers = opts.handlers
        this.incoming = opts.incoming
        this.name = opts.name
        this.logPrefix = 'handler: ' + opts.name + ': '
        this.created = (new Date()).getTime()

        // setup serial
        const parser = this.port.pipe(new Readline({ delimiter: '\r\n' }));

        // setup serial events
        this.port.on('open', () => {
            this.logger.log(this.logPrefix + `Serial opened.`)
            this.emit('connected')
        })
        this.port.on('error', (e) => {
            this.logger.logger.error(this.logPrefix + `ERROR: ${e}`)
            this.emit('error', e)
        });
        this.port.on('close', () => {
            this.logger.log(this.logPrefix + `Serial closed.`)
        })

        parser.on('data', d => { this.data(d) });
    }

    connect() {
        this.emit('connecting')
        this.port.open()
    }

    data(line) {
        this.logger.log(this.logPrefix + '< ' + line);
        try {
            this.emit('activity')

            // handle the line now
            let lineHandled = false

            this.incoming.forEach(p => {
                let match = p.pattern.exec(line)
                if (match) {
                    p.match(match)
                    lineHandled = true;
                }
            })

            if (!lineHandled && process.env.DEBUG) {
                this.logger.log(this.logPrefix + 'WARN: no handler processed line \'' + line + '\' ...')
            }
        } catch(e) {
            this.logger.logger.error(this.logPrefix + 'Exception during ouput: ' + e.message);
        }
    }

    write(msg, callback) {
        this.logger.log(this.logPrefix + '> ' + msg);

        this.port.write(msg + '\n')
        this.port.drain(callback)
    }   

    cancelOperation(snapshot, src) {
        let now = (new Date()).toString()

        this.logger.log(this.logPrefix + 'canceling ' + src + ' op \'' + snapshot.val().command + '\'.')
        snapshot.ref.update({ 'completed': now, 'canceled': now })
    }

    operation(snapshot) {
        let op = snapshot.val()

        // if the operation was in the db before we started, clear it out
        if (op.created < this.created) {
            this.cancelOperation(snapshot, 'older')
            return
        }

        Object.keys(this.handlers).forEach((hp) => {
            if (op.command == hp) {
              this.logger.log(this.logPrefix + 'handling ' + op.command + ' ...')

              // mark it received since all handlers would need to do it
              snapshot.ref.update({ 'received': (new Date()).toString() });

              this.handlers[hp](snapshot, () => {
                this.emit('activity')
                snapshot.ref.update({ 'completed': (new Date()).toString() });
              })
            }
        })
    }

    handle(snapshot) {

        // only push operations that can be handled by this manager
        Object.keys(this.handlers).forEach((hp) => {
            if (snapshot.val().command == hp) {
                this.operation(snapshot)
            }
        })
    }
}