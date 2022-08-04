// const WebSocketServer = require("websocket").server;

import { server as WebSocketServer } from "websocket";
import http from "http";
import faker from "@faker-js/faker";

class TranscriptGenerator {
  speakerId = 0;
  counter = 0;

  speakerChange() {
    let changed = false;
    if (r(0.05)) {
      this.speakerId++;
      changed = true;
    }
    return { changed, speakerId: this.speakerId };
  }

  generate() {
    let wType = "";
    return {
      message: r(0.8)
        ? MessageType.ADD_TRANSCRIPT
        : MessageType.ADD_PARTIAL_TRANSCRIPT,
      metadata: {
        transcript: faker.lorem.word(10),
      },
      results: Array.from({ length: rr(1, 4) }, (_) => {
        const { changed, speakerId } = this.speakerChange();
        return {
          type: changed
            ? "speaker_change"
            : (wType = r(0.1) ? "punctuation" : "word"),
          start_time: this.counter,
          end_time: this.counter++ + 1,
          alternatives: [
            {
              content:
                wType == "punctuation"
                  ? "."
                  : r(0.95)
                  ? faker.lorem.word()
                  : "gnocchi",
              confidence: Math.random(),
              display: {
                direction: "ltr",
              },
              language: "en",
              speaker: ["S1", "S2"][speakerId % 2],
              tags: r(0.1) ? ["profanity"] : undefined,
            },
          ],
        };
      }),
    } as TranscriptionResponse;
  }
}

const gen = new TranscriptGenerator();

const server = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8080, function () {
  console.log(new Date() + " Server is listening on port 8080");
});

const wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false,
});

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on("request", function (request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      new Date() + " Connection from origin " + request.origin + " rejected."
    );
    return;
  }

  const connection = request.accept("rt", request.origin);
  console.log(new Date() + " Connection accepted.");

  let recognitionRunning = false;

  connection.on("message", function (message) {
    if (message.type === "utf8") {
      console.log("Received Message: " + message.utf8Data);

      const socketMessageData = JSON.parse(message.utf8Data);

      switch (socketMessageData.message) {
        case MessageType.START_RECOGNITION:
          connection.sendUTF(
            JSON.stringify({
              message: MessageType.RECOGNITION_STARTED,
            })
          );
          recognitionRunning = true;
          console.log("MessageType.START_RECOGNITION");
          break;

        case MessageType.SET_RECOGNITION_CONFIG:
          connection.sendUTF(
            JSON.stringify({
              message: MessageType.INFO,
            })
          );
          break;

        case MessageType.ADD_AUDIO:
          connection.sendUTF(
            JSON.stringify({
              message: MessageType.AUDIO_ADDED,
            })
          );
          break;

        case MessageType.END_OF_STREAM:
          setTimeout(() => {
            recognitionRunning = false;
          }, 2000);
          break;
      }
    } else if (message.type === "binary") {
      if (r(0.01)) connection.sendUTF(JSON.stringify(gen.generate()));
    }
  });
  connection.on("close", function (reasonCode, description) {
    console.log(
      new Date() + " Peer " + connection.remoteAddress + " disconnected."
    );
  });
});

const r = (tresh: number) => Math.random() < tresh;

const rr = (min: number = 0, max: number = 10) =>
  Math.floor(Math.random() * (max - min)) + min;

const enum MessageType {
  RECOGNITION_STARTED = "RecognitionStarted",
  ADD_PARTIAL_TRANSCRIPT = "AddPartialTranscript",
  ADD_DYNAMIC_TRANSCRIPT = "AddDynamicTranscript",
  ADD_TRANSCRIPT = "AddTranscript",
  AUDIO_ADDED = "AudioAdded",
  END_OF_STREAM = "EndOfStream",
  END_OF_TRANSCRIPT = "EndOfTranscript",
  ERROR = "Error",
  INFO = "Info",
  WARNING = "Warning",
  START_RECOGNITION = "StartRecognition",
  SET_RECOGNITION_CONFIG = "SetRecognitionConfig",
  ADD_AUDIO = "AddAudio",
}

type TranscriptResultType =
  | "word"
  | "punctuation"
  | "speaker_change"
  | "entity";

type TranscriptionResponse = {
  message: MessageType;
  reason?: string;
  seq_no?: number;
  metadata?: {
    start_time?: number;
    end_time?: number;
    transcript: string;
  };
  results?: TranscriptResult[];
};

type TranscriptResult = {
  type: TranscriptResultType;
  start_time: number;
  end_time: number;
  channel?: string;
  is_eos?: boolean;
  spoken_form?: TranscriptResult[];
  written_form?: TranscriptResult[];
  entity_class?: string;
  alternatives: {
    content: string;
    confidence: number;
    display: {
      direction: "ltr" | "rtl";
    };
    language: string;
    speaker?: string;
    tags: string[];
  }[];
};
