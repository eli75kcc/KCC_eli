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
          Authorization: `Bearer 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`
        },
        body: formData
      });
      const whisperData = await whisperRes.json();
      const text = whisperData.text;
      setTranscript(text);
      const detectedLang = whisperData.language || "en";
      setLanguage(detectedLang);

      // 📎 검색 API 예외 처리
      let contextData = { content: "" };
      try {
        const contextRes = await fetch("https://your-server.com/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text })
        });
        if (contextRes.ok) {
          contextData = await contextRes.json();
        }
      } catch (e) {
        console.warn("Context search skipped (no server).");
      }

      // 📎 ChatGPT 호출
      const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: `You are an expert assistant that explains KCC Refinish product information in ${detectedLang}. Use the provided context to answer the user's question.` },
            { role: "system", content: `Reference info:\n${contextData.content}` },
            { role: "user", content: text }
          ]
        })
      });
      const chatData = await chatRes.json();
      const answer = chatData.choices?.[0]?.message?.content || "죄송합니다. 답변을 생성할 수 없습니다.";
      setResponse(answer);

      // 🗣️ 음성 출력
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = detectedLang;
      utterance.onstart = () => {
        console.log("🗣️ Speaking...");
        setSpeaking(true);
      };
      utterance.onerror = (e) => {
        console.error("🔇 Speech synthesis error:", e);
      };
      utterance.onend = () => setSpeaking(false);
      speechSynthesis.speak(utterance);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 7000); // 최대 7초 녹음
  }

  return (
    <div className="p-6 space-y-4 bg-white max-w-lg mx-auto shadow-xl rounded-2xl">
      <img
        src="/my-avatar.png"
        alt="Presenter"
        className={`w-40 h-40 object-cover rounded-full mx-auto border-4 transition-all duration-500 ${speaking ? 'border-blue-500 animate-pulse' : 'border-gray-300'}`}
      />
      <h1 className="text-2xl font-bold text-center">🌍 KCC Refinish Multilingual Voice Chatbot</h1>
      <p className="text-sm text-gray-600 text-center">Speak in any supported language and ask about KCC Refinish products.</p>
      <button onClick={startRecording} disabled={recording} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg">
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
