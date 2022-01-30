import { NS, Player } from "index";
import { ServerStatsReport, ServerStats } from "scripts/utils/scan";
export { ServerStats };
import { Server } from "scripts/utils/bitburner-formulas"

export function canFTP(host: string, ns: NS) {
    return ns.fileExists("FTPCrack.exe", host)
}

export function canSSH(host: string, ns: NS) {
    return ns.fileExists("BruteSSH.exe", host)
}

export function canSMTP(host: string, ns: NS) {
    return ns.fileExists("relaySMTP.exe", host)
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

export type ServerResources = {
    name: string
    availableRam: number
}

export type Allocation = {
    type: HackType,
    scriptRam: number,
    threads: number,
    targetServer: string,
    chance: number
}

export class ServerResourcesReport {
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
                const thisThreads = Math.min(threads, Math.floor(availableRam / scriptRam));
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

type BestServerOption = {
    server: string,
    hackType: HackType,
    dollarRate: number,
    minRequiredThreads: number,
    maxPossibleThreads: number
}

/**
 * For a given server, what is the best possible option we can do right now, if we can only do one: hack, grow, or weaken.
 * Choice is based on a method for calculating $ earned over time.
 * 
 * TODO: big todo, the math here is dubious
 */
function determineBestOperationForServer(server: ServerStats, maxCapacities: { [key: string]: number }, player: Player): BestServerOption | null {
    //what is immediate hack rate
    var topAction, topRate, minRequiredThreads, maxPossibleThreads;
    if (1 <= maxCapacities[HackType.HACK]) {
        topAction = HackType.HACK;
        //TODO do we want the chance in here?
        topRate = (server.money.available * server.hack.percentStolenPerThread * Math.pow(server.hack.chance, 1)) / server.hack.timeMs;
        minRequiredThreads = 1;
        //max threads is the point at which we have hacked all the money
        maxPossibleThreads = Math.floor(1 / server.hack.percentStolenPerThread);
    }

    //can we grow to a point that will yield more money over time?
    //TODO this math might be wrong.
    const growMoneyTippingPoint = server.money.available * (server.hack.timeMs + server.grow.timeMs) / server.hack.timeMs;
    if (growMoneyTippingPoint < server.money.max) {
        //we might be able grow!
        var growThreads = 1;
        //TODO constant time.
        const maxGrowCapacity = maxCapacities[HackType.GROW]
        while (growThreads < maxGrowCapacity) {
            const growthPercentage = Server.calculateServerGrowth(server.security.level, server.grow.rate, growThreads, player);
            const newMoney = server.money.available * growthPercentage;
            if (newMoney >= growMoneyTippingPoint) {
                //yay! we can grow
                var growHackRate = Math.min(server.money.available * growthPercentage * growThreads, server.money.max) * server.hack.percentStolenPerThread * Math.pow(server.hack.chance, 1) / (server.grow.timeMs + server.hack.timeMs)

                //awful but let's find the max the same way
                var maxGrowThreads = growThreads;
                while (maxGrowThreads < maxGrowCapacity) {
                    const growthPercentage = Server.calculateServerGrowth(server.security.level, server.grow.rate, maxGrowThreads, player);
                    if (server.money.available * growthPercentage > server.money.max) {
                        break;
                    }
                    maxGrowThreads++;
                }

                topAction = HackType.GROW;
                //TODO the rate here is not constant, i don't think. uh oh!
                topRate = growHackRate
                minRequiredThreads = growThreads;
                //max threads is the point at which we will have reached the max
                maxPossibleThreads = Math.ceil(server.money.max / (server.money.available * 0.0002));
                // maxPossibleThreads = Math.ceil(server.money.max / (server.money.available * server.grow.rate));
            }
            growThreads++;
        }
    }

    //can we weaken to a point that will yield more money over time?
    var weakenThreads = 1;
    //TODO constant time.
    const maxWeakenCapacity = maxCapacities[HackType.WEAKEN]
    while (weakenThreads <= maxWeakenCapacity) {
        const newDifficultyLevel = server.security.level - (server.weaken.decreasePerThread * weakenThreads);
        if (newDifficultyLevel < server.security.minLevel) {
            //can't go any lower
            break;
        }
        const newHackingChance = Server.calculateHackingChance(newDifficultyLevel, server.security.minLevel, player);
        const newPercentStolenPerThread = Server.calculatePercentMoneyHacked(newDifficultyLevel, server.security.minLevel, player);
        const newHackTime = Server.calculateHackingTime(newDifficultyLevel, server.security.minLevel, player);
        const weakenedHackRate = (server.money.available * newPercentStolenPerThread * Math.pow(newHackingChance, 1)) / (newHackTime + server.weaken.timeMs);
        if (!topRate || weakenedHackRate > topRate) {
            //yay! we can weaken
            topAction = HackType.WEAKEN;
            topRate = weakenedHackRate;
            minRequiredThreads = weakenThreads;
            //max threads is the point at which we will have hit the min security level
            maxPossibleThreads = Math.ceil((server.security.level - server.security.minLevel) / server.weaken.decreasePerThread)
            break;
        }
        weakenThreads++;
    }

    if (topAction) {
        return {
            server: server.name,
            hackType: topAction,
            dollarRate: topRate,
            minRequiredThreads: minRequiredThreads,
            maxPossibleThreads: maxPossibleThreads
        }
    } else {
        return null;
    }
}

/**
 * Overhacking a thread can cause growth problems later, so we can calculate here how much the hack and growth rates of
 * the server would be after hacking with some number of threads. This function will return the max threads we should use
 * before we end up overhacking.
 * 
 * TODO this might be broken as hell
 */
export function determineMaxThreadsToHackWith(server: ServerStats, availableCapacity: number): number {
    var threadsToDedicate = availableCapacity;
    while (threadsToDedicate > 0) {
        //for now we just make sure you can't hack a server to death
        const moneyHacked = server.hack.percentStolenPerThread * threadsToDedicate * server.money.available;
        const endingMoney = server.money.available - moneyHacked;
        if (endingMoney > 0) {
            break;
        }
        threadsToDedicate--;
    }
    return threadsToDedicate;
}

export function determineMaxThreadsToGrowWith(server: ServerStats, availableCapacity: number): number {
    var threadsToDedicate = availableCapacity;
    while (threadsToDedicate > 0) {
        //for now we just make sure you can't hack a server to death
        const moneyGrown = server.grow.rate * threadsToDedicate * server.money.available;
        if (moneyGrown < server.money.max) {
            break;
        }
        threadsToDedicate--;
    }
    return threadsToDedicate;
}

export function decideToHack(ns: NS, serverStatsReport: ServerStatsReport): HackDecision[] {
    const servers: ServerStats[] = Object.values(serverStatsReport);
    const serverResources: ServerResourcesReport = getServerResources(ns, servers.map(server => server.name));
    const availableCapacities: { [key: string]: number } = {};
    availableCapacities[HackType.HACK] = serverResources.availableScriptCapacity(ns.getScriptRam(HackType.HACK));
    availableCapacities[HackType.GROW] = serverResources.availableScriptCapacity(ns.getScriptRam(HackType.GROW));
    availableCapacities[HackType.WEAKEN] = serverResources.availableScriptCapacity(ns.getScriptRam(HackType.WEAKEN));

    const bestServerOptions: BestServerOption[] = [];
    const hackableServers: ServerStats[] = Object.values(serverStatsReport).filter(s => s.money.available > 0);
    for (var server of hackableServers) {
        const bestServerOption: BestServerOption = determineBestOperationForServer(server, availableCapacities, ns.getPlayer())
        if (bestServerOption != null) {
            bestServerOptions.push(bestServerOption);
        }
    }
    //order by dollar rate, descending
    bestServerOptions.sort((a, b) => b.dollarRate - a.dollarRate);
    for (var bestServerOption of bestServerOptions) {
        const scriptRam = ns.getScriptRam(bestServerOption.hackType);
        const availableCapacity = serverResources.availableScriptCapacity(scriptRam);
        if (availableCapacity > 0 && availableCapacity >= bestServerOption.minRequiredThreads) {
            const serverStats = serverStatsReport[bestServerOption.server];
            const threads = Math.min(availableCapacity, bestServerOption.maxPossibleThreads);
            ns.print(`Running ${bestServerOption.hackType} against server ${serverStats.name} with ${threads} threads for $ rate ${bestServerOption.dollarRate}`)
            serverResources.allocate(bestServerOption.hackType, scriptRam, threads, serverStats.name, serverStats.hack.chance);
        }
    }

    return serverResources.decide();
}
