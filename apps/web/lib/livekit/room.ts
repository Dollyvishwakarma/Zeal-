// apps/web/lib/livekit/room.ts
// ═══════════════════════════════════════════════════════════════════════════════
// LiveKit Room Helper (stub — full implementation in audio/video phase)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateMeetingLink(bookingId: string): Promise<string> {
  // Placeholder: returns a deterministic room URL for future LiveKit integration.
  // Replace with real LiveKit SDK when video phase begins.
  return `https://meet.zeal.app/room/${encodeURIComponent(bookingId)}`;
}

export async function createRoomToken(_params: {
  roomName: string;
  participantName: string;
}): Promise<string> {
  // Placeholder token — real JWT comes from LiveKit server SDK
  return "stub-token";
}