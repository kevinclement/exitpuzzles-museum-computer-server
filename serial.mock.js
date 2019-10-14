const readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

module.exports = class BluetoothMock {
    constructor(opts) {
        this.logger = opts.logger;
        this.address = opts.address;
        this.channel = opts.channel;
        this.outputCallback = undefined;
        this.logPrefix = 'bluetooth: ' + opts.name + ': ';

        this.open = false;
        this.connectionStartTime = null;
        this.onLine = this.onLine.bind(this);
        this.buffer = new (require('./buffer'))(this.onLine);
        var bf = this.buffer;

        // hookup stdin to buffer to fake bluetooth output
        rl.on('line', function(str) { 
            bf.onData(str + '\r\n');
        });
    }

    connect(cb) {
        this.log('Connecting to ' + this.address + ' ...')
        this.connectionStartTime = new Date();
        this.buffer.reset();
        setTimeout(() => {
            this.logger.log(this.logPrefix + 'Connected.');
            this.open = true;
            this.connectionStartTime = null;
            if (cb) cb();
        }, 500)
    }

    setOutputCallback(cb) {
        this.outputCallback = cb;
    }

    isConnecting() {
        if (!this.connectionStartTime) return false;

        return true;
    }

    isOpen() {
        return this.open;
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

        // fake it
        setTimeout(() => {
            if (cb) cb();
        }, 100);
    }

    log(msg) {
        this.logger.log(this.logPrefix + msg);
    }

    inquire() {
    }
}


