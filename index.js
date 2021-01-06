let fb = new (require('./firebase'))
let logger = new (require('./logging'))
let run = new (require('./run'))({ logger: logger, db:fb.db })

let managers = [];
managers.push(new (require('./manager.bird'))({ name: 'bird', logger: logger, fb: fb, run:run }))
managers.push(new (require('./manager.clock'))({ name: 'clock', logger: logger, fb: fb, run:run }))

// might want to turn this off while doing dev, so I have a flag for it
let ENABLE_FIREBASE_LOGS = true;
if (ENABLE_FIREBASE_LOGS) {
  logger.enableFirebase(fb.db, 'museum/logs/comp');
}

logger.log('comp: Started ExitPuzzles Computer server.');

// track firebase connect and disconnects and log them so we can see how often it happens
let _connecting = true;
fb.db.ref('.info/connected').on('value', function(connectedSnap) {
  if (connectedSnap.val() === true) {
    logger.log('comp: firebase connected.');
  } else {
    // dont print an error while its still connecting on first start
    if (_connecting) {
      _connecting = false;
    } else {
      logger.log('comp: firebase dropped connection!');
    }
  }
});

// listen for control operations in the db, filter only ops not completed
fb.db.ref('museum/operations').orderByChild('completed').equalTo(null).on("child_added", function(snapshot) {
    logger.log('comp: received op ' + snapshot.val().command);

    managers.forEach((m) => {
        m.handle(snapshot);
    });
 });

// update started time and set a ping timer
fb.db.ref('museum/status/computer').update({
    started: (new Date()).toLocaleString(),
    ping: (new Date()).toLocaleString()
})

// heartbeat timer
setInterval(()  => {
    fb.db.ref('museum/status/computer').update({
      ping: (new Date()).toLocaleString()
    })
}, 30000)
