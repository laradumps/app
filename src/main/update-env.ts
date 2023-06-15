import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

const env: string = fs.readFileSync(".env", { encoding: "utf-8" });
const buf: Buffer = Buffer.from(env);
const currentConfig: dotenv.DotenvParseOutput = dotenv.parse(buf);

function updateEnv(config: dotenv.DotenvParseOutput = {}, eol: string = "\n"): void {
    const envContents: string = Object.entries({ ...currentConfig, ...config })
        .map(([key, val]) => `${key}=${val}`)
        .join(eol);
    fs.writeFileSync(".env", envContents);
}

export default updateEnv;
