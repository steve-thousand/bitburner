import { NS } from "index";

function scanAdjacent(server: string, ns: NS) {
    return ns.scan(server);
}

type ScanOptions = {
    hasRootAccess?: boolean,
    nameFilter?: (name: string) => boolean
}

export function findServers(host: string, maxDepth: number, ns: NS, options: ScanOptions) {
    const found = [host]
    const frontier: [[string, number]] = [[host, 0]]
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

export interface ServerStats {
    name: string,
    hack: {
        chance: number,
        timeMs: number,
        requiredLevel: number,
        percentStolenPerThread: number
    },
    security: {
        level: number,
        minLevel: number
    },
    money: {
        available: number,
        max: number
    },
    grow: {
        timeMs: number,
        rate: number
    },
    weaken: {
        decreasePerThread: number,
        timeMs: number,
    }
    rateDollarsHackedPerThread: number,
    rateDollarsGrownPerThread: number
}

export type ServerStatsReport = {
    [key: string]: ServerStats
}

export async function getServerStatsReport(ns: NS, servers: string | string[]): Promise<ServerStatsReport> {
    const serverStats: ServerStatsReport = {};

    if (typeof servers === "string") {
        servers = [servers];
    }

    for (var server of servers) {

        const hackChance = ns.hackAnalyzeChance(server);
        const hackTime = ns.getHackTime(server);
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);

        const securityLevel = ns.getServerSecurityLevel(server);
        const minSecurityLevel = ns.getServerMinSecurityLevel(server);

        const availableMoney = ns.getServerMoneyAvailable(server);
        const maxMoney = ns.getServerMaxMoney(server);

        const percentPerThread = ns.hackAnalyze(server);

        const growTime = ns.getGrowTime(server);
        const growRate = ns.getServerGrowth(server);

        const securityDecreasePerWeakenThread = ns.weakenAnalyze(1);
        const weakenTime = ns.getWeakenTime(server);

        const dollarsPerSecondPerThread = (availableMoney * percentPerThread * hackChance) / (hackTime / 1000);
        const dollarsGrownPerSecondPerThread = (availableMoney * growRate) / (growTime / 1000)

        serverStats[server] = {
            name: server,
            rateDollarsHackedPerThread: dollarsPerSecondPerThread,
            rateDollarsGrownPerThread: dollarsGrownPerSecondPerThread,
            hack: {
                chance: hackChance,
                timeMs: hackTime,
                requiredLevel: requiredHackingLevel,
                percentStolenPerThread: percentPerThread
            },
            security: {
                level: securityLevel,
                minLevel: minSecurityLevel
            },
            money: {
                available: availableMoney,
                max: maxMoney
            },
            grow: {
                timeMs: growTime,
                rate: growRate
            },
            weaken: {
                decreasePerThread: securityDecreasePerWeakenThread,
                timeMs: weakenTime
            }
        }
    }
    return serverStats;
}