import { Player } from "index";

const ServerBaseGrowthRate = 1.03;
const ServerMaxGrowthRate = 1.003;

export class Server {

    static calculateIntelligenceBonus(intelligence: number, weight = 1): number {
        return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
    }

    static calculateHackingChance(hackDifficulty: number, requiredHackingSkill: number, player: Player): number {
        const hackFactor = 1.75;
        const difficultyMult = (100 - hackDifficulty) / 100;
        const skillMult = hackFactor * player.hacking;
        const skillChance = (skillMult - requiredHackingSkill) / skillMult;
        const chance =
            skillChance * difficultyMult * player.hacking_chance_mult * Server.calculateIntelligenceBonus(player.intelligence, 1);
        if (chance > 1) {
            return 1;
        }
        if (chance < 0) {
            return 0;
        }

        return chance;
    }

    static calculatePercentMoneyHacked(hackDifficulty: number, requiredHackingSkill: number, player: Player): number {
        // Adjust if needed for balancing. This is the divisor for the final calculation
        const balanceFactor = 240;

        const difficultyMult = (100 - hackDifficulty) / 100;
        const skillMult = (player.hacking - (requiredHackingSkill - 1)) / player.hacking;
        const percentMoneyHacked = (difficultyMult * skillMult * player.hacking_money_mult) / balanceFactor;
        if (percentMoneyHacked < 0) {
            return 0;
        }
        if (percentMoneyHacked > 1) {
            return 1;
        }

        //TODO what?
        // return percentMoneyHacked * BitNodeMultipliers.ScriptHackMoney;
        return percentMoneyHacked;
    }

    /**
     * Calculate the time it takes a player to hack a server.
     * 
     * @param player 
     * @param serverSecurityLevel 
     * @param requiredHackingLevel 
     * @returns 
     */
    static calculateHackingTime(hackDifficulty: number, requiredHackingSkill: number, player: Player): number {
        const difficultyMult = requiredHackingSkill * hackDifficulty;

        const baseDiff = 500;
        const baseSkill = 50;
        const diffFactor = 2.5;
        let skillFactor = diffFactor * difficultyMult + baseDiff;
        skillFactor /= player.hacking + baseSkill;

        const hackTimeMultiplier = 5;
        const hackingTime =
            (hackTimeMultiplier * skillFactor) /
            (player.hacking_speed_mult * Server.calculateIntelligenceBonus(player.intelligence, 1));

        //source code returns this in seconds, we do milliseconds
        return hackingTime * 1000;
    }

    static calculateServerGrowth(hackDifficulty: number, serverGrowth: number, threads: number, p: Player, cores = 1): number {
        const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

        //Get adjusted growth rate, which accounts for server security
        const growthRate = ServerBaseGrowthRate;
        let adjGrowthRate = 1 + (growthRate - 1) / hackDifficulty;
        if (adjGrowthRate > ServerMaxGrowthRate) {
            adjGrowthRate = ServerMaxGrowthRate;
        }

        //Calculate adjusted server growth rate based on parameters
        const serverGrowthPercentage = serverGrowth / 100;
        const numServerGrowthCyclesAdjusted =
            numServerGrowthCycles * serverGrowthPercentage // * BitNodeMultipliers.ServerGrowthRate; //TODO

        //Apply serverGrowth for the calculated number of growth cycles
        const coreBonus = 1 + (cores - 1) / 16;
        return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * p.hacking_grow_mult * coreBonus);
    }
}