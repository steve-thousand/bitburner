import { Player } from "index";

export const ServerFortifyAmount = 0.002

export class Server {

    static calculateIntelligenceBonus(intelligence: number, weight = 1): number {
        return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
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

        return hackingTime;
    }
}