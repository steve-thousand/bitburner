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

export type ServerStats = {
    name: string,
    availableMoney: number,
    dollarsPerSecondPerThread: number
}

export async function getServerStats(ns: NS, servers: string[]) {
    const serverStats: { [key: string]: ServerStats } = {};
    for (var server of servers) {
        const availableMoney = ns.getServerMoneyAvailable(server);
        const percentPerThread = ns.hackAnalyze(server);
        const hackChance = ns.hackAnalyzeChance(server);
        const hackTime = ns.getHackTime(server);
        const dollarsPerSecondPerThread = (availableMoney * percentPerThread * hackChance) / (hackTime / 1000);
        // const dollarsGrownPerSecondPerThread = (availableMoney * growthRate) / (growTime / 1000)
        serverStats[server] = {
            name: server,
            availableMoney: availableMoney,
            dollarsPerSecondPerThread: dollarsPerSecondPerThread
        }
    }
    return serverStats;
}