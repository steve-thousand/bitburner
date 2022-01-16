/** @param {import(".").NS } ns */
async function workServer(server, ns) {
	ns.print("Processing host " + server);
	const hackChance = ns.hackAnalyzeChance(server);
	if (hackChance < .2) {
		ns.print(`Hack chance on ${server} too low (${hackChance}), weakening.`);
		return ns.weaken(server);
	} else {
		const potentialEarned = ns.hackAnalyze(server);
		if (!potentialEarned) {
			ns.print(`No money to earn from hacking ${server}, growing.`);
			await ns.grow(server);
		} else {
			await ns.hack(server);
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