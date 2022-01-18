function roundUpHundredth(num) {
    return Math.ceil(num * 100) / 100;
}

/** @param {import(".").NS } ns */
export async function main(ns) {
    const server = ns.args[0]

    const hackChance = ns.hackAnalyzeChance(server);
    const hackTime = ns.getHackTime(server);
    const securityLevel = ns.getServerSecurityLevel(server);
    const minSecurityLevel = ns.getServerMinSecurityLevel(server);
    ns.tprint(`====== HACKING STATS ======`);
    ns.tprint(`Hack chance (%):                 ${roundUpHundredth(hackChance * 100)} %`);
    ns.tprint(`Hack time:                       ${roundUpHundredth(hackTime / 1000)} seconds`);
    ns.tprint(`Security level:                  ${roundUpHundredth(securityLevel)}`);
    ns.tprint(`Min Security level:              ${minSecurityLevel}`);
    ns.tprint(``);

    const moneyPerThread = ns.hackAnalyze(server);
    const moneyAvailable = ns.getServerMoneyAvailable(server)
    const maxMoney = ns.getServerMaxMoney(server)
    ns.tprint(`====== MONEY STATS ======`);
    ns.tprint(`Money stolen per thread (%):     ${roundUpHundredth(moneyPerThread * 100)} %`);
    ns.tprint(`Money available:                 ${ns.nFormat(moneyAvailable, '($ 0.00 a)')}`);
    ns.tprint(`Max money:                       ${ns.nFormat(maxMoney, '($ 0.00 a)')}`);
    ns.tprint(``);

    const growthRate = ns.getServerGrowth(server);
    const growCallsToDoublePerCore = ns.growthAnalyze(server, 1.01, 1);
    const growTimePerThread = ns.getGrowTime(server);
    ns.tprint(`====== GROW STATS ======`);
    ns.tprint(`Growth rate:                     ${growthRate}`)
    ns.tprint(`Grow calls to increase by 1%:    ${roundUpHundredth(growCallsToDoublePerCore)}`);
    ns.tprint(`Grow time:                       ${roundUpHundredth(growTimePerThread / 1000)} seconds`);
    ns.tprint(``);

    const weakenAmountPerThreadPerCore = ns.weakenAnalyze(1, 1);
    const weakenTimePerThread = ns.getWeakenTime(server);
    ns.tprint(`====== WEAKEN STATS ======`);
    ns.tprint(`Weaken per thread:               ${weakenAmountPerThreadPerCore}`);
    ns.tprint(`Weaken time:                     ${roundUpHundredth(weakenTimePerThread / 1000)} seconds`);
    ns.tprint(``);
}