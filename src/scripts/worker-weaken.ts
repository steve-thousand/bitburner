import { NS } from "index";

export async function main(ns: NS) {
    const serverTohack: string = <string>ns.args[0];
    ns.print(`Weakening server ${serverTohack}`);
    const grown = await ns.weaken(serverTohack);
    ns.print(`Byebye`);
}