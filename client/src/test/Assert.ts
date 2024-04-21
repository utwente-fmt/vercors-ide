

/**
 * An extention on the standard node assert 
*/

import { OptionFields } from "../VerCors-CLI-UI";
import { VerCorsPath } from "../vercors-paths-provider";

export class Assert extends require("assert") {
     
    public static isTrue(condition: boolean, message?: undefined) {
        if (!condition) {
            throw new this.AssertionError({
                message: message || 'Assertion failed',
                actual: condition,
                expected: true,
                operator: '==',
                stackStartFn: this.AssertionError,
            });
        }
    }
    

    /**
     * Checks if the actual value is the same as the expected value using an equal method
     * @param actual actual value
     * @param expected expected value
     * @param eql_method equal method to use
     * @param message message to send when there is an error
     */
    public static equals(actual: any,expected: any, eql_method?: (x: any,y: any) => boolean, message?: string){
        if(!eql_method){
            eql_method = (x,y) => x===y
        }

        if (!eql_method(actual, expected)) {
            throw new this.AssertionError({
                message: message || `Expected ${actual} to equal ${expected}`,
                actual: actual,
                expected: expected,
                operator: 'equals',
                stackStartFn: this.equals
            });
        }
    };

    /**
     * Fails if an json string event is not emitted 
     * @param jsonPairs The json tokens with their values
     * @param logger The logger that will log the event when it is posted
     */
    public static failOnJsonEventAbsence(jsonPairs: [string,string][], logger: string[]){

        const jsonLogger = logger.map((l) => JSON.parse(JSON.stringify(l)));
    log: for(let logged of jsonLogger){
            for(let [token,value] of jsonPairs){
                try{ 
                    let jsonLog = JSON.parse(JSON.stringify(logged[token]))
                    let jsonValue = JSON.parse(value)
                    if (!this.jsonComparison(jsonLog,jsonValue)) continue log
                }
                catch{
                    if(logged[token] !== value){
                        continue log;
                    }
                }
            }
            return;
        }
        throw new this.AssertionError({
            message: `Event '${JSON.stringify(jsonPairs)}' not emitted`,
            actual: JSON.stringify(logger),
            expected: JSON.stringify(jsonPairs),
            operator: 'call',
            stackStartFn: this.failOnJsonEventAbsence
            });
    }


    private static jsonComparison(json1: { [x: string]: any; } , json2: { [x: string]: any; }): boolean {
        
        try{ 
            let keys = Object.keys(json1)
            if(keys.length > 0){
                for(let key of keys){
                    if(json1[key] != json2[key] && !this.jsonComparison(json1[key],json2[key])){
                        return false
                    }
                }
            }
            else{
                if(JSON.stringify(json1) === JSON.stringify(json2)){
                    return true
                }else{
                    return false
                } 
            }
        }
        catch{
            if(json1 === json2){
                return true
            }else{
                return false
            }
        }
        return true
    }


}