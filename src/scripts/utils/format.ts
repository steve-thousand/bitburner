import { NS } from "index";

export function formatDollars(ns: NS, money: number): string {
    return ns.nFormat(money, '($ 0.00 a)');
}