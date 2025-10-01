export function successResponse(data: any, message = "Success") {
    return Response.json({ status: "success", message, data });
}

export function errorResponse(message = "Error", status = 400) {
    return Response.json({ status: "error", message }, { status });
}
