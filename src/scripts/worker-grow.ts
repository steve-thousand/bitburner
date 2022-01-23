import { NS } from "index";

export async function main(ns: NS) {
    const serverTohack: string = <string>ns.args[0];
    ns.print(`Hacking server ${serverTohack}`);
    const grown = await ns.grow(serverTohack);
    ns.toast(`Grown server ${serverTohack} by ${grown}`, "success");
    ns.print(`Byebye`);
}