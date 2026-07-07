import {getStats, subscribe, unsubscribe} from "@/app/lib/soullinkStats";
import {SoullinkState, toPublicSoullinkState} from "@/app/lib/types/SoullinkState";

// Public, read-only stream keyed directly by username (no token/auth needed).
// getStats only returns a value while the owner has the soullink page enabled.
// Payloads are trimmed to what the public page renders (see toPublicSoullinkState)
// rather than the full owner/editor state (overlay-only labels, colors, etc.).
export async function GET(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };
            const sendPublic = (stat: SoullinkState) => send(toPublicSoullinkState(stat));

            request.signal.addEventListener("abort", () => {
                unsubscribe(username, sendPublic);
                controller.close();
            });

            const initial = getStats(username);

            if (initial) {
                sendPublic(initial);
            } else {
                controller.enqueue(
                    encoder.encode(`event: not_found\ndata: ${JSON.stringify({error: true})}\n\n`)
                );
                controller.close();
                return;
            }

            subscribe(username, sendPublic);
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    });
}
