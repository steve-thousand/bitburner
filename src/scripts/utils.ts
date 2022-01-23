import { NS, Player } from "index";
import { ServerStats } from "scripts/utils/scan";

class HackingCalculator {
    ns: NS;
    serverStats: ServerStats;

    static calculateIntelligenceBonus(intelligence: number, weight = 1): number {
        return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
    }

    /**
     * Calculate the time it takes to hack a player to hack a server.
     * 
     * 
     * 
     * @param player 
     * @param serverSecurityLevel 
     * @param requiredHackingLevel 
     * @returns 
     */
    static calculateHackingTime(player: Player, serverSecurityLevel: number, requiredHackingLevel: number): number {
        const difficultyMult = requiredHackingLevel * serverSecurityLevel;

        const baseDiff = 500;
        const baseSkill = 50;
        const diffFactor = 2.5;
        let skillFactor = diffFactor * difficultyMult + baseDiff;
        skillFactor /= player.hacking + baseSkill;

        const hackTimeMultiplier = 5;
        const hackingTime =
            (hackTimeMultiplier * skillFactor) /
            (player.hacking_speed_mult * HackingCalculator.calculateIntelligenceBonus(player.intelligence, 1));

        return hackingTime;
    }

    /**
     * Calculate the chance a player would have of hacking a server.
     * 
     * @param player 
     * @param serverSecurityLevel 
     * @param requiredHackingLevel 
     * @returns 
     */
    static calculateHackingChance(player: Player, serverSecurityLevel: number, requiredHackingLevel: number): number {
        const hackFactor = 1.75;
        const difficultyMult = (100 - serverSecurityLevel) / 100;
        const skillMult = hackFactor * player.hacking;
        const skillChance = (skillMult - requiredHackingLevel) / skillMult;
        const chance =
            skillChance * difficultyMult * player.hacking_chance_mult * HackingCalculator.calculateIntelligenceBonus(player.intelligence, 1);
        if (chance > 1) {
            return 1;
        }
        if (chance < 0) {
            return 0;
        }

        return chance;
    }

    /**
     * How much money can we get from this server per second
     * @param server 
     * @returns 
     */
    static calculateDollarsPerSecondPerThread(totalMoney: number, percentStolenPerThread: number, hackTime: number): number {
        return (totalMoney * percentStolenPerThread) / hackTime;
    }

    shouldWeaken() {
        const player = this.ns.getPlayer()
        const serverStats = this.serverStats;

        const potentialSecurityLevel = 0;

        const hackingTime = HackingCalculator.calculateHackingChance(player, potentialSecurityLevel, serverStats.hack.requiredLevel);
        const hackChance = HackingCalculator.calculateHackingChance(player, potentialSecurityLevel, serverStats.hack.requiredLevel);
    }

    static foo(server: ServerStats) {
        // should a server be grown before being hacked???

        // at what point does a thread of hacking return more money per second then a thread of growing could grow?
        const dollarsHackedPerSecond = server.money.available * server.hack.percentStolenPerThread / server.hack.timeMs;
        const dollarsGrownPerSecond = server.money.available * server.grow.rate / server.grow.timeMs;

        if (dollarsHackedPerSecond > dollarsGrownPerSecond) {
            // time to grow maybe?
        }
    }
}