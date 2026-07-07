import {getStats, subscribe, unsubscribe} from "@/app/lib/stats";

// Public, read-only stream keyed directly by username (no token/auth needed).
// getStats only returns a value while the owner has the nuzlocke page enabled.
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

            request.signal.addEventListener("abort", () => {
                unsubscribe(username, send);
                controller.close();
            });

            const initial = getStats(username);

            if (initial) {
                send(initial);
            } else {
                controller.enqueue(
                    encoder.encode(`event: not_found\ndata: ${JSON.stringify({error: true})}\n\n`)
                );
                controller.close();
                return;
            }

            subscribe(username, send);
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
