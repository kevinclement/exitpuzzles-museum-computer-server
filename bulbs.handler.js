var noble = require('@abandonware/noble');
const { colors } = require('./bulbs.color');
const { exec } = require('child_process');
let fb = new (require('./firebase'))
let ref = fb.db.ref('museum/devices/bulb/')

let bulbs = {};
process.argv.forEach((val, index) => {
    if (index < 2) return;

    // format is -> name:color:friendly
    let parts = val.split(':');
    let name = parts[0];
    let color = parts[1];
    let friendly = parts[2];

    bulbs[name] = { color: color, friendly: friendly }
});

var bulbsFound = 0;
const DEV_ID = process.env.NOBLE_HCI_DEVICE_ID
var prefix = DEV_ID + ":"
const white = Buffer.from([0x56, 0x00, 0x00, 0x00, 0xff, 0x0f, 0xaa, 0x3b, 0x07, 0x00, 0x01])

// reset devices
exec(`hciconfig -a hci${DEV_ID} reset`, (error, stdout, stderr) => {
    if (error) {
      err(`exec error: ${error}`);
      return;
    }

    // setup scanning
    noble.on('stateChange', state => {
        if (state === 'poweredOn') {
            log(`Looking for bulbs...`)
            noble.startScanning(['ffe5'])
        }
    })
   
});

// handle commands
process.on('message', (msg) => {
    if (msg.cmd == 'on') {
        turnOn();
    } else if (msg.cmd == 'off') {
        turnOff();
    } else if (msg.cmd == 'color') {
        changeAll(msg.color, false);
    }
});

noble.on('discover', peripheral => {
    const name = peripheral.advertisement.localName

    if (name in bulbs) {
      bulbsFound++;

      log(`  found ${bulbs[name].friendly}`)

      bulbs[name].p = peripheral

      if (bulbsFound == Object.keys(bulbs).length) {
        log(`All bulbs found, discovering now`)

        noble.stopScanning()

        // connect all
        for (var n in bulbs) {
            connect(bulbs[n])
        }
      }
    }
})

function connect(bulb) {
    let peripheral = bulb.p;
    let b = bulb;

    peripheral.once('disconnect', (err) => {
        log(`${b.friendly} disconnected, reconnecting...`)

        ref.child(b.friendly).set("disconnected");
        setTimeout( ()=>{
            console.log(`reconnecting ${b.friendly} now`);
            connect(b);
        }, 10000)

    })

    log(`connecting to ${b.friendly}`)
    ref.child(b.friendly).set("connecting");

    peripheral.connect(error => {
        if (error) {
            err(`ERROR: ${error} for ${b.friendly}`)
            ref.child(b.friendly).set("error");
        } else {
            ref.child(b.friendly).set("connected");
            log(`${b.friendly} connected`)
        }
        
        if (!b.wrote && b.data) {
            log(`didnt write data, writing now`)
            write(b)
        }
    })
}

function write(bulb) {
    let b = bulb;

    if (!b.p || b.p.state != "connected") {
        log(`not connected to ${b.friendly}, ignoring write`);
        return;
    }

    b.p.writeHandle(0x000b, b.data, false, error => {
        if (error) {
            err(`BLE: Write Error for ${b.friendly}: ${error}`)
        } else {
            //log(`wrote: updating ${b.friendly} (${b.p.address})`)
            b.wrote = true;
            b.data = null;
        }
    });
}

function changeAll(color) {
    let keys = Object.keys(bulbs)
    for (let i=0; i<keys.length; i++) {
        let hex = colors.toHex(color)

        const col = Buffer.from([0x56, hex.r, hex.g, hex.b, 0x00, 0xf0, 0xaa, 0x3b, 0x07, 0x00, 0x01])
        let bulb = bulbs[keys[i]];

        bulb.data = col;
        bulb.wrote = false;
        bulb.hex = hex;

        write(bulb)
    }
}

function turnOn() {
    for (let n in bulbs) {
        let bulb =  bulbs[n];

        let hex = colors.toHex(bulb.color)
        const col = Buffer.from([0x56, hex.r, hex.g, hex.b, 0x00, 0xf0, 0xaa, 0x3b, 0x07, 0x00, 0x01])

        bulb.data = col;
        bulb.wrote = false;
        bulb.hex = hex;

        write(bulb);
    }
}

function turnOff() {
    for (let n in bulbs) {
        let bulb =  bulbs[n];

        bulb.data = white;
        bulb.wrote = false;
        bulb.hex = { r:0, g:0, b:0 };

        write(bulb);
    }
}

function log(str) {
    if (process.env.DEBUG) {
        console.log(`${prefix} ${str}`)
    }
}
function err(str) {
    console.log(`${prefix} ${str}`)
}