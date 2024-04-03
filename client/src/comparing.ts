export class comparing {

    public static eqSet = (xs, ys,equalFn?) => {
        equalFn = equalFn? equalFn: (x,y) => x===y;
        return xs.size === ys.size &&
        [...xs].every((x) => [...ys].some((y) => equalFn(y,x)));}
        

    public static compareLists(l1, l2,equalFn?){
        if (!l1 || !l2){
            return false;
        }
        if(l1.length !== l2.length){
            return false;
        }
        const s1 = new Set(l1);
        const s2 = new Set(l2);

        return comparing.eqSet(s1,s2,equalFn)
    }

}