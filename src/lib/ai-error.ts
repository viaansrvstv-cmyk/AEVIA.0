export function friendlyAIError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    /not connected|server key|OPENAI_API_KEY|HTTP 401|HTTP 403|provider rejected/i.test(message)
  ) {
    return "AI is not connected right now. The rest of AEVIA still works, or add the server-side AI key and try again.";
  }
  if (/busy|429/i.test(message))
    return "The AI service is busy right now. Please try again in a moment.";
  if (/empty answer|length limit|took too long|could not be reached/i.test(message)) {
    return "The AI service did not return a usable answer. Please try again.";
  }
  return "AI is unavailable right now. Please try again.";
}
