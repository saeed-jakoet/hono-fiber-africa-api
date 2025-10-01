import {ZodSchema} from "zod";
import type {ValidationTargets} from "hono";
import {zValidator as zv} from "@hono/zod-validator";

class HTTPException extends Error {
    status: number;
    cause: any;

    constructor(status: number, options: { cause: any }) {
        super(options.cause.message);
        this.status = status;
        this.cause = options.cause;
    }
}

export const zValidator = <
    T extends ZodSchema,
    Target extends keyof ValidationTargets
>(
    target: Target,
    schema: T
) =>
    zv(target, schema, (result, c) => {
        if (!result.success) {
            throw new HTTPException(400, {cause: result.error});
        }
    });
