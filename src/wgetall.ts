import { NS } from "index";

const FLAG_SCHEMA: [string, string | number | boolean | string[]][] = [
    ['host', 'localhost'],
    ['port', 8080],
]

export async function main(ns: NS) {
    const flags = ns.flags(FLAG_SCHEMA);

    //delete existing scripts
    const existingFiles = ns.ls("home", "scripts/")
    for (var file of existingFiles) {
        ns.tprint(`Deleting exiting file ${file} from home`);
        ns.rm(file, "home");
    }

    const files = [
        "scripts/buyserver.js",
        "scripts/hackanalyze.js",
        "scripts/main.js",
        "scripts/worker-grow.js",
        "scripts/worker-hack.js",
        "scripts/utils/bitburner-formulas.js",
        "scripts/utils/format.js",
        "scripts/utils/hack.js",
        "scripts/utils/scan.js",
    ]
    for (var file of files) {
        const url = `http://${flags.host}:${flags.port}/${file}`;
        ns.tprint(`Downloading ${file} from ${url}`);
        const success = await ns.wget(url, "/" + file);
        if (!success) {
            ns.tprint(`Failed downloading ${file} from ${url}!`)
            return;
        }
        await ns.asleep(100);
    }
}