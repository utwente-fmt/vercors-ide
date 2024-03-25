import * as assert from "assert";

export class Assert{

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

}