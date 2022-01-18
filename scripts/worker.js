/** @param {import(".").NS } ns */
async function workServer(server, ns) {
	ns.print("Processing host " + server);
	const hackChance = ns.hackAnalyzeChance(server);
	if (hackChance < .2) {
		ns.print(`Hack chance on ${server} too low (${hackChance}), weakening.`);
		const weakened = ns.weaken(server);
		ns.toast(`Weakened ${server} by ${weakened}`, "info");
	} else {
		const potentialEarned = ns.hackAnalyze(server);
		if (!potentialEarned) {
			ns.print(`No money to earn from hacking ${server}, growing.`);
			const growth = await ns.grow(server);
			ns.toast(`Grew ${server} by ${growth}`, "info");
		} else {
			const earnedMoney = await ns.hack(server);
			if (earnedMoney > 0) {
				const formattedEarnedMoney = ns.nFormat(earnedMoney, '($ 0.00 a)');
				ns.toast(`Hacked ${formattedEarnedMoney} from ${server}`, "success");
			} else {
				ns.toast(`Failed hacking ${server}...`, "warning")
			}
		}
	}
}

/** @param {import(".").NS } ns */
export async function main(ns) {
	var randomStarted = false
	while (true) {
		const servers = ns.read("servers-to-hack.txt").trim().split("\n")

		//have all workers crawl from a different starting point, so we aren't all hacking the same servers at once
		var startingOffset = 0
		if (!randomStarted) {
			startingOffset += Math.floor(Math.random() * servers.length);
			randomStarted = true;
		}

		for (var i = 0 + startingOffset; i < servers.length; i++) {
			const server = servers[i];
			await workServer(server, ns)
		}
	}
}