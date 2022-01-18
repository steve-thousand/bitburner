const FLAG_SCHEMA = [
    ['noprompt', false],
    ['name', 'home']
]

/** @param {import(".").NS } ns */
export async function main(ns) {
    const flags = ns.flags(FLAG_SCHEMA);
    const ram = flags["_"][0];
    const cost = ns.getPurchasedServerCost(ram);
    const formattedCost = ns.nFormat(cost, '($ 0.00 a)');

    var newServerName = flags["name"];
    if (flags["name"] === "home") {
        const servers = ns.scan("home").filter(server => server.startsWith("home-")).map(server => parseInt(server.replace("home-", "")));
        var newIndex = 1;
        if (servers.length > 0) {
            newIndex = Math.max(...servers) + 1;
        }
        ns.print(`Found existing home server indeces: [${servers}], new index will be ${newIndex}`);
        newServerName = `home-${newIndex}`
    }

    const purchase = await ns.prompt(`Cost of server with ${ram}GB ram: ${formattedCost}.\n\nPurchase server with name "${newServerName}"?`);
    if (purchase) {
        const result = ns.purchaseServer(newServerName, ram);
        if (!result) {
            ns.toast(`Failed to purchase server "${newServerName}" with ${ram}GB for ${formattedCost}!`, "error", 5000);
        } else {
            ns.toast(`Purchased server "${newServerName}" with ${ram}GB for ${formattedCost}.`, "success", 5000);
        }
    }
}