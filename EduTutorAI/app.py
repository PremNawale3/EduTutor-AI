import os
from flask import Flask, render_template, request, jsonify
from edu_engine import generate_response

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json or {}
        
        # Mode / Persona selection (default, coder, concept, quiz)
        mode = data.get("mode", "default")
        # Explanation level (beginner, balanced, advanced)
        level = data.get("level", "balanced")
        
        # Check if frontend passed full conversation history or single message
        messages = data.get("messages")
        if not messages:
            user_message = data.get("message", "")
            if not user_message.strip():
                return jsonify({"error": "Empty message"}), 400
            messages = [{"role": "user", "content": user_message}]
        
        bot_reply = generate_response(messages, mode=mode, level=level)
        return jsonify({"reply": bot_reply, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e), "reply": f"⚠️ Server Error: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "tutor": "EduTutor AI",
        "primary_model": "openai/gpt-oss-120b (Groq)",
        "fallback_model": "openai/gpt-oss-20b",
        "modes": ["default", "coder", "concept", "quiz"],
        "levels": ["beginner", "balanced", "advanced"]
    })

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
