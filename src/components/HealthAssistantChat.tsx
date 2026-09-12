import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Grid, Info } from "lucide-react";
import { askAssistant, suggestedQuestions, ASSISTANT_DISCLAIMER } from "@/lib/mediex/assistant";

interface MenuChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  options?: string[];
  showMainMenuButton?: boolean;
}

export default function HealthAssistantChat() {
  const [messages, setMessages] = useState<MenuChatMessage[]>([
    {
      id: "0",
      role: "assistant",
      text: "Hello! 👋 I am your Mediex AI Assistant. Please select an option from the menu below or type your question directly.",
      options: suggestedQuestions,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleShowMainMenu = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        text: "📋 **Main Menu**: Please pick a topic or type your question below:",
        options: suggestedQuestions,
      },
    ]);
  };

  const handleSend = async (questionText?: string) => {
    const text = (questionText || input).trim();
    if (!text || typing) return;

    const userMessage: MenuChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    try {
      const response = await askAssistant(text);
      const botMessage: MenuChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: response,
        showMainMenuButton: true,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "The assistant could not respond right now. Please try again.",
          showMainMenuButton: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3">
      {/* Disclaimer */}
      <div className="flex shrink-0 items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200/60">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>{ASSISTANT_DISCLAIMER}</p>
      </div>

      {/* Chat Container */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                  <Bot size={16} />
                </div>
              )}

              <div className="flex max-w-[85%] flex-col gap-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-tr-none bg-teal-600 text-white"
                      : "rounded-tl-none bg-slate-100 text-slate-800"
                  }`}
                >
                  {message.text}
                </div>

                {/* Inline Options */}
                {message.role === "assistant" && message.options && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {message.options.map((optionText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(optionText)}
                        disabled={typing}
                        className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-left text-xs font-medium text-teal-800 transition-all hover:bg-teal-600 hover:text-white disabled:opacity-50"
                      >
                        {optionText}
                      </button>
                    ))}
                  </div>
                )}

                {/* Back to Menu Button */}
                {message.role === "assistant" && message.showMainMenuButton && (
                  <div className="mt-1">
                    <button
                      onClick={handleShowMainMenu}
                      disabled={typing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Grid size={14} />
                      Back to Main Menu
                    </button>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User size={16} />
                </div>
              )}
            </motion.div>
          ))}

          {typing && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <Bot size={16} />
              </div>
              <div className="flex gap-1 rounded-2xl rounded-tl-none bg-slate-100 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Bar */}
        <div className="shrink-0 border-t border-slate-100 p-3 md:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2"
          >
            <button
              type="button"
              onClick={handleShowMainMenu}
              disabled={typing}
              title="Open Main Menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <Grid size={18} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question or pick an option..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={typing || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
