module.exports = class Runs {
    constructor(opts) {
        this.runsRef = opts.db.ref('museum/runs')
        this.run = undefined
        this.logger = opts.logger
        this.logPrefix =  'run: '

        opts.db.ref('museum/runs').orderByKey().limitToLast(2000).on('value', (snapshot) => {
            let latest = undefined;
            for (const [date, run] of Object.entries(snapshot.val())) {
                if (run.finished == "") {
                    latest = date
                }
            }

            if (latest) {
                this.logger.log(this.logPrefix + `using ${latest} for run analytics.`)
                this.run = opts.db.ref('museum/runs').child(latest)
            } else {
                this.run = undefined
            }
        })
    }

    clockSolved(forced) {
        if (this.run) {
            this.run.child("events/clock").update({
                timestamp: (new Date()).toLocaleString(),
                force: forced ? true : false
            })
        } else {
            this.logger.log(this.logPrefix + 'WARN: clock: run not defined, not updating analytics')
        }
    }

    birdSolved(forced) {
        if (this.run) {
            this.run.child("events/bird").update({
                timestamp: (new Date()).toLocaleString(),
                force: forced ? true : false
            })
        } else {
            this.logger.log(this.logPrefix + 'WARN: bird: run not defined, not updating analytics')
        }
    }
}