export class comparing {

    public static eqSet = (xs: Set<any>, ys: Set<any>, equalFn?: (a: any, b: any) => boolean) => {
        equalFn = equalFn ? equalFn : (x: any, y: any) => x === y;
        return xs.size === ys.size &&
            [...xs].every((x) => [...ys].some((y) => equalFn(y, x)));
    };


    public static compareLists(l1: any[], l2: any[], equalFn?: (a: any, b: any) => boolean): boolean {
        if (!l1 || !l2 || l1.length !== l2.length) {
            return false;
        }
        const s1 = new Set(l1);
        const s2 = new Set(l2);

        return comparing.eqSet(s1, s2, equalFn);
    }

}