function send(response, status, body) {
  response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(response, 405, { error: "Method not allowed" });
  }

  const provider = request.query.provider;
  if (provider !== "google" && provider !== "apple") {
    return send(response, 400, { error: "Unsupported calendar provider" });
  }

  if (provider === "apple") {
    return send(response, 501, {
      error: "Apple Calendar sync is not configured",
      detail: "Use a server-side CalDAV or calendar-feed integration. Never collect an Apple ID password.",
    });
  }

  return send(response, 501, {
    error: "Google Calendar server connection is not configured",
    detail: "Configure the server OAuth exchange and encrypted token store before enabling calendar access.",
  });
}
