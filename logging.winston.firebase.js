const Transport = require('winston-transport');
const util = require('util');

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
module.exports = class WinstonFirebase extends Transport {
  
  constructor(opts) {
    super(opts);

    this.db = opts.db;
  }

  log(info, callback) {
    let line = info[Symbol.for('message')];

    this.db.ref('museum').child('logs').push({
         timestamp: (new Date()).toString(),
         data: line
    });

    // Perform the writing to the remote service
    callback();
  }
};