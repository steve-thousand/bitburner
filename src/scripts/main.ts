import { NS } from "index";
import { findServers, getServerStats } from "scripts/utils";

/**
 * This script automatically takes control of new servers as they are determined to be ownable.
 */

/** @param {import(".").NS } ns */
function canFTP(host: string, ns: NS) {
    return ns.fileExists("FTPCrack.exe", host)
}

/** @param {import(".").NS } ns */
function canSSH(host: string, ns: NS) {
    return ns.fileExists("BruteSSH.exe", host)
}

/** 
 * Crawl to a depth for servers that we do not own but could own, and attempt to take control.
 * @param {import(".").NS } ns 
 */
function crawlAndOwn(maxDepth: number, ns: NS) {
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

async function directToHackServer(ns: NS, hackingServer: string, serverToHack: string) {
    const processes = ns.ps(hackingServer);
    if (processes.filter(process => process.filename === "/scripts/worker-hack.js").length > 0) {
        ns.print(`Server ${hackingServer} already hacking, skipping.`);
        return 0;
    }

    const ramForScript = ns.getScriptRam("/scripts/worker-hack.js");
    const maxRam = ns.getServerMaxRam(hackingServer);
    const threads = Math.floor(maxRam / ramForScript);
    if (threads <= 0) {
        return 0;
    }

    const copied = await ns.scp("/scripts/worker-hack.js", "home", hackingServer);
    if (!copied) {
        ns.print(`Failed to copy to server ${hackingServer}`)
        return;
    }

    ns.print(`Directing ${hackingServer} to hack ${serverToHack} with ${threads} threads`);
    ns.killall(hackingServer);
    const pid = ns.exec("/scripts/worker-hack.js", hackingServer, threads, serverToHack)
    if (pid === 0) {
        ns.print(`Failed to start script on server ${hackingServer}`)
        return;
    }

    return threads;
}

async function manageWorkers(ns: NS) {
    const servers = findServers("home", 5, ns, { hasRootAccess: true, nameFilter: name => name !== "home" });
    const serverStats = await getServerStats(ns, servers);
    const highestEarningServer = Object.values(serverStats).sort((a, b) => b.dollarsPerSecondPerThread - a.dollarsPerSecondPerThread)[0]
    ns.print(`Picked highest earning server ${highestEarningServer.name} with estimated earnings of ${highestEarningServer.dollarsPerSecondPerThread} per second per thread`);

    var launchedThreads = 0;
    var launchedServers = 0;
    for (var server of servers) {
        const threads = await directToHackServer(ns, server, highestEarningServer.name);
        if (threads > 0) {
            launchedThreads += threads;
            launchedServers += 1;
        }
    }

    if (launchedThreads > 0) {
        ns.toast(`Launched ${launchedThreads} threads across ${launchedServers} servers...`, "info")
    }
}

const FLAG_SCHEMA: [string, string | number | boolean | string[]][] = [
    ['restartWorkers', false]
]

/** @param {import(".").NS } ns */
export async function main(ns: NS) {
    const flags = ns.flags(FLAG_SCHEMA);
    ns.print(`flags: ${JSON.stringify(flags)}`)
    ns.disableLog("ALL");
    while (true) {
        crawlAndOwn(5, ns);
        await manageWorkers(ns)
        flags.restartWorkers = false;
        await ns.asleep(10000);
    }
}