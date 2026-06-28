import {appendFileSync, mkdirSync} from "fs";
import {join} from "path";

const logPath = process.env.LOG_PATH ?? join(process.cwd(), "logs", "app.log");
mkdirSync(join(logPath, ".."), {recursive: true});

log("INFO", `Server started. Log: ${logPath}`);

export function log(level: "INFO" | "ERROR", message: string) {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    process.stdout.write(line);
    if (process.env.NODE_ENV === "development") {
        console.log(line);
    }

    appendFileSync(logPath, line);
}
