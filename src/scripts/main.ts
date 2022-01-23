import { NS } from "index";
import { findServers, getServerStatsReport } from "scripts/utils/scan";
import { canFTP, canSSH, decideToHack, HackDecision, HackType } from "scripts/utils/hack";

/** 
 * Crawl to a depth for servers that we do not own but could own, and attempt to take control.
 */
function crawlAndOwn(maxDepth: number, ns: NS) {
    const homeServer = "home";

    // find frontier servers we don't own
    const foundServers = findServers(homeServer, maxDepth, ns, { hasRootAccess: false });

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
            continue;
        }

        const numberPortsRequired = ns.getServerNumPortsRequired(server);

        if (numberPortsRequired > portsAbleToOpen) {
            continue;
        }
        ownableServers.push(server);
    }

    if (ownableServers.length > 0) {
        ns.print(`Detected servers that are ownable: [${ownableServers}]`)
    }

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

async function runScriptOnServer(ns: NS, workingServer: string, targetServer: string, script: string, threadCount: number, id: string) {
    const copied = await ns.scp(script, "home", workingServer);
    if (!copied) {
        ns.print(`Failed to copy ${script} to server ${workingServer}`)
        return;
    }

    const pid = ns.exec(script, workingServer, threadCount, targetServer, id)
    if (pid === 0) {
        ns.print(`Failed to start script ${script} on server ${workingServer}`)
        return;
    }
    return pid;
}

// https://stackoverflow.com/a/21963136/3529744
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function manageWorkers(ns: NS) {
    const servers = findServers("home", 5, ns, { hasRootAccess: true, nameFilter: name => name !== "home" });
    const serverStatsReport = await getServerStatsReport(ns, servers);
    const hackDecisions: HackDecision[] = decideToHack(ns, serverStatsReport);

    var launchedThreads = 0;
    for (var hackDecision of hackDecisions) {
        const decisionId = uuid();
        var threadCount = hackDecision.threadCount;
        var threadsPerProcess = Math.floor(hackDecision.threadCount * hackDecision.chance);
        if (threadsPerProcess == 0) {
            threadsPerProcess = threadCount;
        }
        let count = 1;
        //splitting up the processes when the hack chance decreases helps limit loss (i think?)
        while (threadCount > 0) {
            if (threadCount < threadsPerProcess) {
                threadsPerProcess = threadCount;
            }
            const pid = await runScriptOnServer(ns, hackDecision.workerServer, hackDecision.targetServer, hackDecision.type, threadsPerProcess, decisionId + "_" + count)
            threadCount -= threadsPerProcess;
            if (pid > 0) {
                launchedThreads += threadsPerProcess;
            }
            count++;
        }
    }

    if (launchedThreads > 0) {
        ns.toast(`Launched ${launchedThreads} threads...`, "info")
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
        await ns.asleep(5000);
    }
}