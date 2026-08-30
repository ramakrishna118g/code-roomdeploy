import mediasoup from "mediasoup";

let worker;
let router;

export async function initMediasoup() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
    ],
  });
  console.log("Mediasoup router ready");
  return { worker, router };
}

export function getRouter() {
  return router;
}
