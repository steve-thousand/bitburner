import { assert } from "chai";
import { ServerResourcesReport, ServerResources } from "../../../src/scripts/utils/hack"

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
    });
});