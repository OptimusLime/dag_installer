#!/usr/bin/env node
const shell = require('shelljs')
const _ = require('lodash')
const toposort = require('toposort')
const fs = require('fs')
const path = require('path')
const { Command, flags } = require('@oclif/command')

let jsonParse = (fname) => {
    return JSON.parse(fs.readFileSync(fname))
}

let recurseCheckDepends = (pjson, graph, nmodules, noCycle, primeCheck, log, matchName) => {


    let allDeps = _.merge(pjson["dependencies"], pjson["peerDependencies"])
    // log("Checking: ", pjson["name"], "and deps: ", allDeps)
    // get our dependencies 
    for (var depName in allDeps) {
        // let's check to make sure never seen before 
        // okay we are good to go
        // let's check the node_modules directory
        // log("Checking: ", depName)
        let DepPath = path.join(nmodules, depName)
        let isPrime = primeCheck[depName] == null ? fs.existsSync(path.join(DepPath, matchName)) : primeCheck[depName]
        primeCheck[depName] = isPrime
        if (!isPrime)
            continue
        // These are prime packages from here on out
        let depjson = jsonParse(path.join(DepPath, "package.json"))
        // and away we go again
        log(`Found ${matchName} Package: `, depName, "edge:", pjson["name"], "::", depName)
        graph.push([pjson["name"], depName])
        // we need to visit and extend the connections for everyone, but we cannot recurse the same 
        // node more than once
        if (noCycle[depName] == null) {
            recurseCheckDepends(depjson, graph, nmodules, noCycle, primeCheck, log, matchName)
            noCycle[depName] = true
        }
    }
}


class LS extends Command {
    async run() {
        const { flags } = this.parse(LS)

        let pjson = jsonParse(path.join(flags.dir, "package.json"))
        console.log("Operating at :", flags.dir)

        var rdir = path.resolve(flags.dir)
        // going to ignore any root connections
        pjson["name"] = "root"
        let nmodules = path.join(flags.dir, "node_modules")
        let graph = []
        let noCycle = {}
        let primeCheck = {}

        recurseCheckDepends(pjson, graph, nmodules, {}, {}, this.log, flags.match)

        let sortedInstall = toposort(graph).reverse()
        this.log("Graph", graph)
        this.log("Install", sortedInstall)

        for (var g = 0; g < sortedInstall.length; g++) {
            var depName = sortedInstall[g]
            // skip root
            if (depName == "root")
                continue


            // let's move to the right location
            var depLoc = path.join(nmodules, depName)
            this.log(`Fake Install: ${depName}@${depLoc}`)
            // should be inside the folder
            shell.cd(`${rdir}/node_modules/${depName}`);

            // must have vcpkg for now
            let pkg_dir = path.dirname(path.resolve(shell.which("vcpkg").stdout.toLowerCase()))
            shell.env["VCPKG_ROOT"] = pkg_dir
            this.log("VCPkg:", pkg_dir)
            // now let's execute the build command
            if (shell.exec('npm run primeinstall').code !== 0) {
                shell.echo(`Error: prime install failed ${depName}`);
                shell.exit(1);
            }
            // // now we should be able to execute
            // shell.ls('*.json').forEach(element => {
            //     console.log("fake check json: ", element)
            // });
        }
        // let files = fs.readdirSync(flags.dir)
        // for (let f of files) {
        // this.log(f)
        // }
    }
}

LS.flags = {
    version: flags.version(),
    help: flags.help(),
    match: flags.string({
        char: 'm',
        default: '.mprime'
    }),
    // run with --dir= or -d=
    dir: flags.string({
        char: 'd',
        default: process.cwd(),
    }),
}

LS.run()
    .catch(require('@oclif/errors/handle'))