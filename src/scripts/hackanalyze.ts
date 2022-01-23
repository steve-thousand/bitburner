import { NS } from "index";
import { getServerStatsReport, ServerStatsReport } from "scripts/utils/scan";
import { formatDollars } from "scripts/utils/format"

function roundUpHundredth(num: number) {
    return Math.ceil(num * 100) / 100;
}

export async function main(ns: NS) {
    const server: string = <string>ns.args[0]

    const serverStateReport: ServerStatsReport = await getServerStatsReport(ns, server);
    const serverStats = serverStateReport[server];

    const hackChance = serverStats.hack.chance;
    const hackTime = serverStats.hack.timeMs;
    const securityLevel = serverStats.security.level;
    const minSecurityLevel = serverStats.security.minLevel;
    ns.tprint(`====== HACKING STATS ======`);
    ns.tprint(`Hack chance (%):                 ${roundUpHundredth(hackChance * 100)} %`);
    ns.tprint(`Hack time:                       ${roundUpHundredth(hackTime / 1000)} seconds`);
    ns.tprint(`Security level:                  ${roundUpHundredth(securityLevel)}`);
    ns.tprint(`Min Security level:              ${minSecurityLevel}`);
    ns.tprint(``);

    const moneyPerThread = serverStats.hack.percentStolenPerThread;
    const moneyAvailable = serverStats.money.available;
    const maxMoney = serverStats.money.max;
    ns.tprint(`====== MONEY STATS ======`);
    ns.tprint(`Money stolen per thread:         ${roundUpHundredth(moneyPerThread * 100)} % / ${ns.nFormat(moneyAvailable * moneyPerThread, '($ 0.00 a)')}`);
    ns.tprint(`Money available:                 ${ns.nFormat(moneyAvailable, '($ 0.00 a)')}`);
    ns.tprint(`Max money:                       ${ns.nFormat(maxMoney, '($ 0.00 a)')}`);
    ns.tprint(``);

    const growthRate = serverStats.grow.rate;
    const growTimePerThread = serverStats.grow.timeMs;
    ns.tprint(`====== GROW STATS ======`);
    ns.tprint(`Growth rate:                     ${growthRate}`)
    ns.tprint(`Grow time:                       ${roundUpHundredth(growTimePerThread / 1000)} seconds`);
    ns.tprint(``);

    const weakenAmountPerThreadPerCore = serverStats.weaken.decreasePerThread;
    const weakenTimePerThread = serverStats.weaken.timeMs;
    ns.tprint(`====== WEAKEN STATS ======`);
    ns.tprint(`Weaken per thread:               ${weakenAmountPerThreadPerCore}`);
    ns.tprint(`Weaken time:                     ${roundUpHundredth(weakenTimePerThread / 1000)} seconds`);
    ns.tprint(``);

    ns.tprint(`====== RATES ======`);
    ns.tprint(`Hack rate:                       ${formatDollars(ns, serverStats.rateDollarsHackedPerThread)}`)
    ns.tprint(`Grow rate:                       ${formatDollars(ns, serverStats.rateDollarsGrownPerThread)}`);
    ns.tprint(``);
}