import { assert } from "chai";
import { ServerResourcesReport, ServerResources, HackType } from "../../../src/scripts/utils/hack"

describe('ServerResourcesReport tests', () => {
    it('available capacity uses correct math', () => {
        const serverResources: ServerResources[] = [
            { name: 'foo', availableRam: 16 }
        ];
        const bar = new ServerResourcesReport(serverResources);
        assert.equal(bar.availableScriptCapacity(2), 8)
        assert.equal(bar.availableScriptCapacity(3), 5)
        assert.equal(bar.availableScriptCapacity(4), 4)
        assert.equal(bar.availableScriptCapacity(5), 3)
        assert.equal(bar.availableScriptCapacity(16), 1)
        assert.equal(bar.availableScriptCapacity(17), 0)
    });
    it('test allocation', () => {
        const serverResources: ServerResources[] = [
            { name: 'foo', availableRam: 16 }
        ];
        const bar = new ServerResourcesReport(serverResources);
        bar.allocate(HackType.HACK, 3, 3, "bar", .95);
        assert.deepEqual({
            "foo": [
                {
                    type: HackType.HACK,
                    scriptRam: 3,
                    threads: 3,
                    targetServer: "bar",
                    chance: .95
                }
            ]
        }, bar.allocations)
        bar.allocate(HackType.HACK, 3, 2, "foo", .60);
        assert.deepEqual({
            "foo": [
                {
                    type: HackType.HACK,
                    scriptRam: 3,
                    threads: 3,
                    targetServer: "bar",
                    chance: .95
                },
                {
                    type: HackType.HACK,
                    scriptRam: 3,
                    threads: 2,
                    targetServer: "foo",
                    chance: .60
                }
            ]
        }, bar.allocations)
    });
    it('test allocation across multiple servers', () => {
        const serverResources: ServerResources[] = [
            { name: 'foo', availableRam: 16 },
            { name: 'bar', availableRam: 16 }
        ];
        const bar = new ServerResourcesReport(serverResources);
        bar.allocate(HackType.HACK, 3, 9, "bar", .95);
        assert.deepEqual({
            "foo": [
                {
                    type: HackType.HACK,
                    scriptRam: 3,
                    threads: 5,
                    targetServer: "bar",
                    chance: .95
                }
            ],
            "bar": [
                {
                    type: HackType.HACK,
                    scriptRam: 3,
                    threads: 4,
                    targetServer: "bar",
                    chance: .95
                }
            ]
        }, bar.allocations)
    });
    it('allocation should reduce capacity', () => {
        const serverResources: ServerResources[] = [
            { name: 'foo', availableRam: 16 }
        ];
        const bar = new ServerResourcesReport(serverResources);
        bar.allocate(HackType.HACK, 3, 3, "bar", .95);
        assert.equal(bar.availableScriptCapacity(2), 3)
        assert.equal(bar.availableScriptCapacity(3), 2)
        assert.equal(bar.availableScriptCapacity(4), 1)
        assert.equal(bar.availableScriptCapacity(5), 1)
        assert.equal(bar.availableScriptCapacity(7), 1)
        assert.equal(bar.availableScriptCapacity(8), 0)
    });
});