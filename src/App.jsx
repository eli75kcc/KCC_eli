import { useState } from "react";

export default function VoiceChatBot() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [language, setLanguage] = useState("en");
  const [speaking, setSpeaking] = useState(false);

  async function startRecording() {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      setRecording(false);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const audioFile = new File([blob], 'input.webm');

      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `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`
        },
        body: formData
      });
      const whisperData = await whisperRes.json();
      const text = whisperData.text;
      setTranscript(text);
      const detectedLang = whisperData.language || "en";
      setLanguage(detectedLang);

      const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: `You are an expert assistant that explains KCC Refinish product information in ${detectedLang}. Be helpful and concise.`
            },
            {
              role: "user",
              content: text
            }
          ]
        })
      });
      const chatData = await chatRes.json();
      const answer = chatData.choices?.[0]?.message?.content || "죄송합니다. 답변을 생성할 수 없습니다.";
      setResponse(answer);

      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = detectedLang;
      utterance.onstart = () => {
        setSpeaking(true);
        console.log("🗣️ Speaking...");
      };
      utterance.onerror = (e) => {
        console.error("🔇 Speech error:", e);
      };
      utterance.onend = () => setSpeaking(false);
      speechSynthesis.speak(utterance);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 7000);
  }

  return (
    <div className="p-6 space-y-4 bg-white max-w-lg mx-auto shadow-xl rounded-2xl">
      <img
        src="/my-avatar.png"
        alt="Presenter"
        className={`w-24 h-24 object-cover rounded-full mx-auto border-4 transition-all duration-500 ${speaking ? 'border-blue-500 animate-pulse' : 'border-gray-300'}`}
      />
      <h1 className="text-2xl font-bold text-center">🌍 KCC Refinish Voice Chatbot</h1>
      <p className="text-sm text-gray-600 text-center">Ask your question in any language!</p>
      <button
        onClick={startRecording}
        disabled={recording}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg"
      >
        {recording ? "🎙️ Listening..." : "🎤 Ask a Question"}
      </button>
      <div className="bg-gray-100 p-4 rounded-xl">
        <p className="text-sm text-gray-500 mb-1">Transcript:</p>
        <p className="text-black">{transcript}</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-xl">
        <p className="text-sm text-blue-600 mb-1">Answer:</p>
        <p className="text-black font-medium whitespace-pre-wrap">{response}</p>
      </div>
    </div>
  );
}
