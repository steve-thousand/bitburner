import { NS } from "index";
import { ServerStatsReport } from "scripts/utils/scan";
import { Server, ServerFortifyAmount } from "scripts/utils/bitburner-formulas"
import { formatDollars } from "scripts/utils/format"

export function canFTP(host: string, ns: NS) {
    return ns.fileExists("FTPCrack.exe", host)
}

export function canSSH(host: string, ns: NS) {
    return ns.fileExists("BruteSSH.exe", host)
}

export enum HackType {
    HACK = "/scripts/worker-hack.js",
    GROW = "/scripts/worker-grow.js",
    WEAKEN = "/scripts/worker-weaken.js"
}

export type HackDecision = {
    type: HackType
    workerServer: string
    targetServer: string
    threadCount: number
    chance: number
}

type ServerResources = {
    name: string
    availableRam: number
}

type Allocation = {
    type: HackType,
    scriptRam: number,
    threads: number,
    targetServer: string,
    chance: number
}

class ServerResourcesReport {
    serverResources: ServerResources[]
    allocations: { [key: string]: Allocation[] }
    constructor(serverResources: ServerResources[]) {
        this.serverResources = serverResources;
        this.allocations = {};
    }
    availableScriptCapacity(scriptRam: number): number {
        const allocations = this.allocations;
        return this.serverResources.map(serverResources => {
            var availableRam = serverResources.availableRam;
            //discount any ram we have already allocated
            if (allocations.hasOwnProperty(serverResources.name)) {
                for (var allocation of allocations[serverResources.name]) {
                    availableRam -= allocation.scriptRam * allocation.threads;
                }
            }
            return Math.floor(availableRam / scriptRam)
        }).reduce((a, b) => a + b)
    }
    allocate(type: HackType, scriptRam: number, threads: number, targetServer: string, chance: number): void {
        //decide which servers to spread the threads across
        for (const serverResource of this.serverResources) {
            const server = serverResource.name
            if (!this.allocations[server]) {
                this.allocations[server] = []
            }
            let availableRam = serverResource.availableRam;
            for (var existingAllocation of this.allocations[server]) {
                availableRam -= existingAllocation.scriptRam * existingAllocation.threads;
            }
            if (availableRam > scriptRam) {
                const thisThreads = Math.floor(availableRam / scriptRam);
                this.allocations[server].push({
                    type: type,
                    scriptRam: scriptRam,
                    threads: thisThreads,
                    targetServer: targetServer,
                    chance: chance
                });
                threads -= thisThreads;
            }
            if (threads === 0) {
                break;
            }
        }
    }
    decide(): HackDecision[] {
        const hackDecisions: HackDecision[] = []
        for (var server of Object.keys(this.allocations)) {
            for (var allocation of this.allocations[server]) {
                hackDecisions.push({
                    type: allocation.type,
                    workerServer: server,
                    targetServer: allocation.targetServer,
                    threadCount: allocation.threads,
                    chance: allocation.chance
                });
            }
        }
        return hackDecisions
    }
}

function getAvailableRam(ns: NS, server: string) {
    return ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
}

function getServerResources(ns: NS, servers: string[]): ServerResourcesReport {
    return new ServerResourcesReport(servers.map(server => {
        return {
            name: server,
            availableRam: getAvailableRam(ns, server)
        }
    }));
}

/**
 * I would like this function to TELL ME WHAT TO DO.
 * 
 * Top priority is always: maximize potential $ over time. So, we should compare the following:
 * 1. The max potential $/s to hack right now
 * 2. The potential $/s we would have if instead we were to grow a server and then hack
 * 3. The potential $/s we would have if instead we were to weaken a server and then hack.
 * 
 * Once all of these are compared, we pick the highest.
 * 
 * Of course, the logic here will eventually need to account for the fact that the even though hacking a server right now
 * is profitable, it may not be a good idea to hit it with everything we've got (we could reduce the amount of money to
 * much that growth takes too long, or we may completely drain a server and it may never grow again.)
 */
export function decideToHack(ns: NS, servers: ServerStatsReport): HackDecision[] {
    const serverResources = getServerResources(ns, Object.keys(servers));
    const serversByHackRate = Object.values(servers).sort((a, b) => {
        return b.rateDollarsHackedPerThread - a.rateDollarsHackedPerThread
    });

    //prioritize hacking
    const HACK_RAM = ns.getScriptRam(HackType.HACK);
    var availableHackCapacity = serverResources.availableScriptCapacity(HACK_RAM);
    for (var server of serversByHackRate) {
        if (availableHackCapacity == 0) {
            break;
        }
        // if hack rate is greater than grow rate, hack until it won't be.
        var threadsToDedicate = availableHackCapacity;
        const minSecurityLevel = server.security.minLevel;
        while (threadsToDedicate > 0) {
            //will this result in less growth than hacking?
            const moneyHacked = server.hack.percentStolenPerThread * threadsToDedicate * server.money.available;
            const endingMoney = server.money.available - moneyHacked;
            if (endingMoney > 0) {
                //TODO: player will also change, right?
                const newHackDifficulty = server.security.level * ServerFortifyAmount * threadsToDedicate;
                const newPercentStolenPerThread = Server.calculatePercentMoneyHacked(newHackDifficulty, minSecurityLevel, ns.getPlayer());
                const newHackTime = Server.calculateHackingTime(newHackDifficulty, minSecurityLevel, ns.getPlayer());

                const endingHackRate = newPercentStolenPerThread * endingMoney / newHackTime;
                const endingGrowthRate = server.grow.rate * endingMoney / (newHackTime * 3.2 /* growtime multiplier */);
                if (endingHackRate < endingGrowthRate) {
                    const toSteal = server.hack.percentStolenPerThread * threadsToDedicate * server.money.available;
                    const toStealFormatted = formatDollars(ns, server.hack.percentStolenPerThread * threadsToDedicate * server.money.available);
                    const available = formatDollars(ns, server.money.available)
                    const dollarsPerSecondFormatted = formatDollars(ns, toSteal / (server.hack.timeMs / 1000));
                    ns.print(`Hacking ${server.name} with ${threadsToDedicate} threads in ${Math.floor(server.hack.timeMs) / 1000}s (${toStealFormatted} of ${available} at ${Math.floor(server.hack.chance * 100)}% chance) = ${dollarsPerSecondFormatted} per second`);
                    break;
                }
            }
            threadsToDedicate--;
        }
        if (threadsToDedicate > 0) {
            serverResources.allocate(HackType.HACK, HACK_RAM, threadsToDedicate, server.name, server.hack.chance)
        }
        availableHackCapacity -= threadsToDedicate;
    }

    const GROW_RAM = ns.getScriptRam(HackType.GROW);
    var availableGrowCapacity = serverResources.availableScriptCapacity(GROW_RAM);
    if (availableGrowCapacity > 0) {
        ns.print(`Detected ${availableGrowCapacity} threads available for grow.`)
    }
    //grow is second priority
    // for (var server of serversByHackRate) {

    // }

    const hackDecisions: HackDecision[] = serverResources.decide();
    // if (hackDecisions.length > 0) {
    //     ns.print(`Decided to hack: ${JSON.stringify(hackDecisions)}`)
    // }
    return hackDecisions;
}