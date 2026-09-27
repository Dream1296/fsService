type ParamType = "number" | "string" | "boolean";


// number/string/boolean 对应的真实类型
type ParamValue<T extends ParamType> =
    T extends "number"
        ? number
        : T extends "string"
            ? string
            : boolean;


// ---------- 函数重载 ----------

// number
export function getParam(
    query: any,
    key: string,
    type: "number",
    defaultValue: number
): number;

export function getParam(
    query: any,
    key: string,
    type: "number",
    defaultValue: null
): number | null;


// string
export function getParam(
    query: any,
    key: string,
    type: "string",
    defaultValue: string
): string;

export function getParam(
    query: any,
    key: string,
    type: "string",
    defaultValue: null
): string | null;


// boolean
export function getParam(
    query: any,
    key: string,
    type: "boolean",
    defaultValue: boolean
): boolean;

export function getParam(
    query: any,
    key: string,
    type: "boolean",
    defaultValue: null
): boolean | null;


// ---------- 实现 ----------
export function getParam(
    query: any,
    key: string,
    type: ParamType,
    defaultValue: any
): any {

    const value = query[key];


    // 参数不存在
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }


    switch (type) {

        case "number": {
            const num = Number(value);

            return Number.isFinite(num)
                ? num
                : defaultValue;
        }


        case "string": {

            return String(value);
        }


        case "boolean": {

            if (value === true || value === "true") {
                return true;
            }


            if (value === false || value === "false") {
                return false;
            }


            return defaultValue;
        }
    }
}