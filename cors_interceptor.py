from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    # Intercept OPTIONS requests and respond directly
    if flow.request.method == "OPTIONS":
        flow.response = http.Response.make(
            200,  # Status code for a successful OPTIONS request
            b"",  # Empty body for OPTIONS
            {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",  # Cache the preflight response for 1 day
            },
        )

def response(flow: http.HTTPFlow) -> None:
    # Add CORS headers to responses from the server for non-OPTIONS requests
    flow.response.headers["Access-Control-Allow-Origin"] = "*"
