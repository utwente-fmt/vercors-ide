import * as assert from "assert";
/**
 * An extention on the standard node assert 
*/

export class Assert{

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

}