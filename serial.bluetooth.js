const BluetoothSerialPort = require('bluetooth-serial-port');

const CONNECTION_TIMEOUT_MS = 10000;
let CONNECTION_TRIES = 6;

module.exports = class Bluetooth {
    constructor(opts) {
        this.logger = opts.logger;
        this.address = opts.address;
        this.channel = opts.channel;
        this.outputCallback = undefined;
        this.logPrefix = 'bluetooth: ' + opts.name + ': ';

        this.rfcomm = new BluetoothSerialPort.BluetoothSerialPort();
        this.connectionStartTime = null;
        this.onLine = this.onLine.bind(this);
        this.buffer = new (require('./buffer'))(this.onLine);
    }

    connect(cb) {
        // only log the connection tries for a few times so we don't spam the logs since it 
        // will be offline most cases
        if (CONNECTION_TRIES > 0) {
            this.log(this.logPrefix + 'Connecting to ' + this.address + ' ...')
            CONNECTION_TRIES--;
        } else {
            if (CONNECTION_TRIES === 0) {
                this.logger.log(this.logPrefix + 'Sleeping logs for reconnect.');
                CONNECTION_TRIES = -1;
            }
        }

        this.connectionStartTime = new Date();

        // remove any previous listeners in case this is a reconnect
        this.buffer.reset();
        this.rfcomm.removeListener('data', this.buffer.onData);

        this.rfcomm.connect(this.address, this.channel, () => {
            CONNECTION_TRIES = 6;
            this.logger.log(this.logPrefix + 'Connected.');
            this.connectionStartTime = null;

            // hookup data streaming for pure logging
            this.rfcomm.on('data', this.buffer.onData)

            // tell consumer that we're connected
            if (cb) cb();
        });
    }

    disconnect() {
        this.logger.log(this.logPrefix + 'Disconnecting ' + this.address + '...');
        this.rfcomm && this.rfcomm.close();
        this.connectionStartTime = null;
    }

    setOutputCallback(cb) {
        this.outputCallback = cb;
    }

    isConnecting() {
        if (!this.connectionStartTime) return false;

        // if its past our timeout, then kill the connection so we can try again
        if ((new Date()).getTime() - this.connectionStartTime.getTime() > CONNECTION_TIMEOUT_MS) {
            this.log('Connecting time out. Restarting connection.');
            this.rfcomm.close();
            this.connectionStartTime = null;
        }

        return true;
    }

    isOpen() {
        return this.rfcomm.isOpen();
    }

    onLine(line) {
        this.logger.log(this.logPrefix + '< ' + line);
        if (this.outputCallback) {
            this.outputCallback(line);
        }
    }

    write(msg, cb) {
        if (!this.isOpen()) {
            this.logger.logger.error(this.logPrefix + 'Trying to write to device but not yet connected.');
        }

        this.logger.log(this.logPrefix + '> ' + msg);

        this.rfcomm.write(Buffer.from(msg, 'utf-8'), function(err, bytesWritten) {
            if (err) this.logger.logger.error(this.logPrefix + err);

            if (cb) cb(err);
        });
    }

    log(msg) {
        if (CONNECTION_TRIES > 0) {
            this.logger.log(this.logPrefix + msg);
        }
    }

    inquire() {
        // TODO: possibly hook this up to web api and log what it finds
        //       I don't think I need it if I already know the addresses
        //       See bluetooth-serial-port example for inquery
    }
}


