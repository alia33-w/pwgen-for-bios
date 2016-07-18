type Predicate<T> = (val: T) => boolean;
type Tuple<A, B> = [A, B];
type BIOSSolver = (val: string) => string[];

export const enum BIOSModels {
    Sony = 1,
    Samsung,
    Phoenix,
    HPCompaq,
    FSIPhoenix,
    FSILPhoenix,
    FSIPPhoenix,
    FSISPhoenix,
    FSIXPhoenix,
    Insyde,
    HPMini
};

interface BIOSDecoder {
    model: BIOSModels;
    name: string;
    description?: string;
    examples?: string[];
    check: Predicate<string>;
    solve: BIOSSolver;
}

type FindResult = Tuple<string[], BIOSDecoder>;

namespace Utils {
    /* May be need add 51, 52 and 53 symbol  */
    const keyboardDict: {[key: number]: string} = {
        2: "1",  3: "2",  4: "3",  5: "4",  6: "5",  7: "6",  8: "7",  9: "8",
        10: "9", 11: "0", 16: "q", 17: "w", 18: "e", 19: "r", 20: "t", 21: "y",
        22: "u", 23: "i", 24: "o", 25: "p", 30: "a", 31: "s", 32: "d", 33: "f",
        34: "g", 35: "h", 36: "j", 37: "k", 38: "l", 44: "z", 45: "x", 46: "c",
        47: "v", 48: "b", 49: "n", 50: "m"
    };
    // Integer divide
    // TODO: Possible update this code
    export function div(a: number, b: number): number {
        return a / b - a % b / b;
    }
    /* Decode Keyboard code to Ascii symbol */
    export function keyboardEncToAscii(inKey: number[]): string {
        let out = "";
        for (let i = 0; i < inKey.length; i++) {
            if (inKey[i] === 0) return out;
            if (inKey[i] in keyboardDict) {
                out += keyboardDict[inKey[i]];
            } else {
                return "";
            }
        }
        return out;
    }
}

/* Return password for old sony laptops
 * password 7 digit number like 1234567 */
function SonySolver(serial: string): string {
    if (serial.length !== 7) {
        return null;
    }
    const table = "0987654321876543210976543210982109876543109876543221098765436543210987";
    let code = "";
    for (let i = 0; i < serial.length; i++) {
        code += table.charAt(parseInt(serial.charAt(i), 10) + 10 * i);
    }
    return code;
}

/* Return password for samsung laptops
 *  12 or 18 hexhecimal digits like 07088120410C0000 */
function SamsungSolver(serial: string): string[] {

    const rotationMatrix1 = [
        7, 1, 5, 3, 0, 6, 2, 5, 2, 3, 0, 6, 1, 7, 6, 1, 5, 2, 7, 1, 0, 3, 7,
        6, 1, 0, 5, 2, 1, 5, 7, 3, 2, 0, 6
    ];
    const rotationMatrix2 = [
        1, 6, 2, 5, 7, 3, 0, 7, 1, 6, 2, 5, 0, 3, 0, 6, 5, 1, 1, 7, 2, 5, 2,
        3, 7, 6, 2, 1, 3, 7, 6, 5, 0, 1, 7
    ];

    function keyToAscii(inKey: number[]): string {
        let out = "";
        for (let i = 0; i < inKey.length; i++) {
            if (inKey[i] === 0) return out;
            if (inKey[i] < 32 || inKey[i] > 127) return undefined;
            out += String.fromCharCode(inKey[i]);
        }

        return out;
    }

    function decryptHash(hash: number[], key: number, rotationMatrix: number[]) {
        let outhash: number[] = [];
        for (let i = 0; i < hash.length; i++) {
            let val = ((hash[i] << (rotationMatrix[7 * key + i])) & 0xFF) |
                      (hash[i] >> (8 - rotationMatrix[7 * key + i]));
            outhash.push(val);
        }
        return outhash;
    }

    let hash: number[] = [];
    for (let i = 1; i < Utils.div(serial.length, 2); i++) {
        let val = parseInt(serial.charAt(2 * i) + serial.charAt(2 * i + 1), 16);
        hash.push(val);
    }
    let key = parseInt(serial.substring(0, 2), 16) % 5;

    let calcScanCodePwd = (matrix: number[]) =>
        Utils.keyboardEncToAscii(decryptHash(hash, key, matrix));

    let scanCodePassword = calcScanCodePwd(rotationMatrix1);
    if (scanCodePassword === "") {
        scanCodePassword = calcScanCodePwd(rotationMatrix2);
    }

    let asciiPassword1 = keyToAscii(decryptHash(hash, key, rotationMatrix1));
    let asciiPassword2 = keyToAscii(decryptHash(hash, key, rotationMatrix2));

    // TODO: This might require polyfil
    return [scanCodePassword, asciiPassword1, asciiPassword2].
        filter(code => code ? true : false);
}


export let Sony: BIOSDecoder = {
    model: BIOSModels.Sony,
    name: "Sony",
    examples: ["1234567"],
    check: (s) => /\d{7}/gi.test(s),
    solve: (s) => {
        let res = SonySolver(s);
        return res ? [res] : [];
    }
};

export let Samsung: BIOSDecoder = {
    model: BIOSModels.Samsung,
    name: "Samsung",
    examples: ["07088120410C0000"],
    check: (s) => /[0-9ABCDEF]+/gi.test(s) && (
        s.length === 12 || s.length === 14 || s.length === 16
    ),
    solve: SamsungSolver
};

export let Decoders: BIOSDecoder[] = [
    Sony, Samsung
];

export function runDecoder(serial: string, decoder: BIOSDecoder): string[] {
    return decoder.check(serial) ? decoder.solve(serial) : [];
}

export function runDecoders(serial: string, decoders: BIOSDecoder[]): FindResult[] {
    return decoders.map((dec: BIOSDecoder): FindResult =>
        [runDecoder(serial, dec), dec]).filter(res => res[0].length > 0);
}

export let findPassword = (serial: string) => runDecoders(serial, Decoders);