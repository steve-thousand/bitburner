/**
 * This script automatically takes control of new servers as they are determined to be ownable.
 */

/** @param {import(".").NS } ns */
function scanAdjacent(server, ns) {
    return ns.scan(server);
}

/** @param {import(".").NS } ns */
function findServers(host, maxDepth, ns, _options) {
    var options = {
        hasRootAccess: undefined,
        nameFilter: undefined
    }
    if (_options) {
        for (const key in _options) {
            options[key] = _options[key]
        }
    }
    const found = [host]
    const frontier = [[host, 0]]
    while (frontier.length > 0) {
        const frontier_current = frontier.pop();
        if (frontier_current[1] <= maxDepth) {
            const adjacent = scanAdjacent(frontier_current[0], ns);
            for (var server of adjacent) {
                if (found.indexOf(server) < 0) {
                    found.push(server)
                    frontier.push([server, frontier_current[1] + 1])
                }
            }
        }
    }
    found.sort();

    for (var i = found.length - 1; i >= 0; i--) {
        const hasRootAccess = ns.hasRootAccess(found[i]);
        if (options.hasRootAccess !== undefined && options.hasRootAccess != hasRootAccess) {
            found.splice(i, 1);
        } else if (options.nameFilter !== undefined && !options.nameFilter(found[i])) {
            found.splice(i, 1);
        }
    }

    return found;
}

/** @param {import(".").NS } ns */
function fileExists(file, host, ns) {
    return ns.fileExists(file, host)
}

/** @param {import(".").NS } ns */
function canFTP(host, ns) {
    return fileExists("FTPCrack.exe", host, ns)
}

/** @param {import(".").NS } ns */
function canSSH(host, ns) {
    return fileExists("BruteSSH.exe", host, ns)
}

/** 
 * Crawl to a depth for servers that we do not own but could own, and attempt to take control.
 * @param {import(".").NS } ns 
 */
function crawlAndOwn(maxDepth, ns) {
    ns.print("Crawling for new servers to own...");

    const homeServer = "home";

    // find frontier servers we don't own
    const foundServers = findServers(homeServer, maxDepth, ns, { hasRootAccess: false });
    ns.print(`Detected servers we do not yet own: [${foundServers}]`)

    var portsAbleToOpen = 0;
    if (canSSH(homeServer, ns)) {
        portsAbleToOpen += 1
    }
    if (canFTP(homeServer, ns)) {
        portsAbleToOpen += 1
    }

    // see if we are capable of owning them
    const ownableServers = []
    for (var server of foundServers) {
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
        const currentHackingLevel = ns.getHackingLevel();
        if (requiredHackingLevel > currentHackingLevel) {
            ns.print(`Hacking level ${currentHackingLevel} not high enough to own server ${server} (${requiredHackingLevel})`)
            continue;
        }

        const numberPortsRequired = ns.getServerNumPortsRequired(server);

        if (numberPortsRequired > portsAbleToOpen) {
            ns.print(`Cannot open enough ports to own server ${server}`)
            continue;
        }
        ownableServers.push(server);
    }

    ns.print(`Detected servers that are ownable: [${ownableServers}]`)

    for (var server of ownableServers) {
        ns.print(`Attempting to own server ${server}...`)
        try {
            if (canSSH(homeServer, ns)) {
                ns.brutessh(server);
            }
            if (canFTP(homeServer, ns)) {
                ns.ftpcrack(server);
            }
            ns.nuke(server);
            ns.print(`Successfully owned server ${server}`)
            ns.tprint(`Successfully owned server ${server}`)
            ns.toast(`Successfully owned server ${server}`, "success", 10000)
        } catch (error) {
            ns.print(`Failed to own server ${server} due to: ${error}`)
            ns.toast(`Failed to own server ${server} due to: ${error}`, "error", 10000)
        }
    }
}

/** 
 * The "servers-to-hack.txt" file is read by all hacking workers, and is updated in real-time so workers can proceed without
 * needing a restart.
 * @param {import(".").NS } ns
 */
async function updateServersToHackTxt(maxDepth, ns) {
    const hackableServers = findServers("home", maxDepth, ns, {
        hasRootAccess: true, nameFilter: (server) => {
            return server !== "home" && !server.startsWith("home-")
        }
    }).join("\n");
    await ns.write("servers-to-hack.txt", hackableServers, "w")
    const ownedServers = findServers("home", maxDepth, ns, { hasRootAccess: true });
    for (var server of ownedServers) {
        await ns.scp("servers-to-hack.txt", server)
    }
}

/** @param {import(".").NS } ns */
async function manageWorkers(maxDepth, ns, restartWorkers = false) {
    const ownedServers = findServers("home", maxDepth, ns, { hasRootAccess: true });
    const memoryRequiredForWorkerThread = ns.getScriptRam("worker.js");
    var restartedServers = 0;
    var restartedWorkers = 0;
    for (var server of ownedServers) {
        if (server === "home") {
            //TBD how to handle more than just the worker scripts running on a single box
            continue;
        }
        // determine how many we should run
        const maxRam = ns.getServerMaxRam(server);
        const goalThreads = parseInt(maxRam / (memoryRequiredForWorkerThread));

        var foundRunningWorker = false;
        if (restartWorkers) {
            ns.killall(server);
        } else {
            const processes = ns.ps(server);
            for (var process of processes) {
                if (process.filename === "worker.js") {
                    if (process.threads !== goalThreads) {
                        ns.print(`Found worker on server ${server} but with incorrect threads ${process.threads}, killing`)
                        //for now, assuming we should only ever be running the worker on these servers.
                        ns.killall(server);
                    } else {
                        foundRunningWorker = true
                    }
                }
            }
        }

        if (!foundRunningWorker) {
            await ns.scp("worker.js", server)
            const pid = ns.exec("worker.js", server, goalThreads)
            if (pid === 0) {
                ns.print(`Failed to start ${goalThreads} workers on server ${server}`)
            } else {
                ns.print(`Started ${goalThreads} workers on server ${server} with PID ${pid}`)
                restartedServers += 1;
                restartedWorkers += goalThreads;
            }
        }
    }

    if (restartedServers > 0) {
        ns.toast(`Launched ${restartedWorkers} workers across ${restartedServers} servers.`, "info", 5000)
    }
}

const FLAG_SCHEMA = [
    ['restartWorkers', false]
]

/** @param {import(".").NS } ns */
export async function main(ns) {
    const flags = ns.flags(FLAG_SCHEMA);
    ns.print(`flags: ${JSON.stringify(flags)}`)
    ns.disableLog("ALL");
    while (true) {
        crawlAndOwn(3, ns);
        await updateServersToHackTxt(3, ns);
        await manageWorkers(3, ns, flags.restartWorkers)
        flags.restartWorkers = false;
        await ns.asleep(30000);
    }
}