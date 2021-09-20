#!/usr/bin/env node

const toposort = require('toposort')
const fs = require('fs')
const { Command, flags } = require('@oclif/command')

class LS extends Command {
    async run() {
        const { flags } = this.parse(LS)
        let files = fs.readdirSync(flags.dir)
        for (let f of files) {
            this.log(f)
        }
    }
}

LS.flags = {
    version: flags.version(),
    help: flags.help(),
    // run with --dir= or -d=
    dir: flags.string({
        char: 'd',
        default: process.cwd(),
    }),
}

LS.run()
    .catch(require('@oclif/errors/handle'))