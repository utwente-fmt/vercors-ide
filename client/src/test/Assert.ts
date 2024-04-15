import * as assert from "assert";
import { EventEmitter } from "stream";
import { waitUntil } from "async-wait-until";
import { comparing } from "../comparing";

/**
 * An extention on the standard node assert 
*/

export class Assert {

    /**
     * Checks if the actual value is the same as the expected value using an equal method
     * @param actual actual value
     * @param expected expected value
     * @param eql_method equal method to use
     * @param message message to send when there is an error
     */
    public static equals(actual,expected,eql_method?: (x,y) => boolean, message?){
        if(!eql_method){
            eql_method = (x,y) => x===y
        }

        if (!eql_method(actual, expected)) {
            throw new assert.AssertionError({
                message: message || `Expected ${actual} to equal ${expected}`,
                actual: actual,
                expected: expected,
                operator: 'equals',
                stackStartFn: this.equals
            });
        }
    };

    /**
     * The ok message for assert, for consitancy added. 
     * Now we only use one assert class
     */
    public static ok(value: unknown, message?: string | Error){
        return assert.ok(value,message)
    }

    /**
     * Fails if an json string event is not emitted 
     * @param jsonPairs The json tokens with their values
     * @param logger The logger that will log the event when it is posted
     */
    public static failOnJsonEventAbsence(jsonPairs: [string,string][], logger: string[]){

        const jsonLogger = logger.map((l) => JSON.parse(JSON.stringify(l)));
        for(let logged of jsonLogger){
            for(let [token,value] of jsonPairs){
                if(logged[token] !== value){
                    continue;
                }
            }
            return
        }
        throw new assert.AssertionError({
            message: `Event '${JSON.stringify(jsonPairs)}' not emitted`,
            actual: JSON.stringify(logger),
            expected: JSON.stringify(jsonPairs),
            operator: 'call',
            stackStartFn: this.failOnJsonEventAbsence
            });
    }



}