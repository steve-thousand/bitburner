import { NS } from "index";

export async function main(ns: NS) {
    const serverTohack: string = <string>ns.args[0];
    ns.print(`Hacking server ${serverTohack}`);
    const earnedMoney = await ns.hack(serverTohack);
    if (earnedMoney > 0) {
        const formattedEarnedMoney = ns.nFormat(earnedMoney, '($ 0.00 a)');
        ns.toast(`Hacked ${formattedEarnedMoney} from ${serverTohack}`, "success");
    } else {
        ns.toast(`Failed hacking ${serverTohack}...`, "warning")
    }
    ns.print(`Byebye`);
}