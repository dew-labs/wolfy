import { createLogger } from "@freyr/shared/utils";
import { t } from "elysia";
import { TypeCompiler } from "elysia/type-system";

const logger = createLogger("BackendConfig");

const envSchema = t.Object({
    ENV: t.String(),
    BACKEND_PORT: t.Optional(t.String()),
    DATABASE_HOST: t.String(),
    DATABASE_PORT: t.String(),
    DATABASE_USER: t.String(),
    DATABASE_PASS: t.String(),
    DATABASE_NAME: t.String(),
    CA_CERT: t.Optional(t.String()),
    BACKEND_SENTRY_DNS: t.String(),
});

const compiler = TypeCompiler.Compile(envSchema);
if (!compiler.Check(process.env)) {
    const errors = [...compiler.Errors(process.env)];
    const computedErrorMessages: Record<string, string[]> = {};
    for (const { path, message } of errors) {
        const envVarName = path.replace(/^\//, "");
        if (!computedErrorMessages[envVarName]) {
            computedErrorMessages[envVarName] = [];
        }
        computedErrorMessages[envVarName].push(message);
    }
    const errorTextParts: string[] = [
        "Invalid environment variables",
        ...Object.entries(computedErrorMessages).map(
            ([varName, messages]) => `  ${varName} : ${messages.join(", ")}`
        ),
    ];
    logger.error(errorTextParts.join("\n"));
    process.exit(1);
}

export const config = compiler.Decode(process.env);
