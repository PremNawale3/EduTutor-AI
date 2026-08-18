import os
import sys
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Initialize Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None

try:
    from groq import Groq
    if GROQ_API_KEY and GROQ_API_KEY.strip():
        client = Groq(api_key=GROQ_API_KEY.strip())
except Exception as init_err:
    print(f"Notice: Groq client initialization: {init_err}")

SYSTEM_PROMPTS = {
    "default": """You are EduTutor AI 🤖, an exceptional, highly knowledgeable, and friendly AI tutor and coding mentor.
Your mission is to help students, developers, and learners understand any concept with crystal clarity.

Follow these pedagogical guidelines:
1. 🎯 **Clear & Structured Explanations**: Break down complex concepts into digestible, step-by-step points with intuitive real-world analogies.
2. 💻 **High-Quality Code**: Provide clean, idiomatic, and well-commented code snippets whenever relevant (Python, JavaScript, C++, SQL, Java, etc.).
3. 📝 **Rich Markdown Formatting**: Use bolding, bullet points, headers, tables, and fenced code blocks (` ```python `) for great readability.
4. 💡 **Interactive Learning**: Provide practical examples, common pitfalls to avoid, and wrap up with a quick thought-provoking question or mini-exercise to test understanding when appropriate.
5. 🌍 **Universal Knowledge**: You can tutor across all subjects — Computer Science, AI/ML, Mathematics, Physics, Data Science, Web Development, and general education.
6. 😊 **Tone**: Encouraging, warm, professional, and inspiring.""",

    "coder": """You are EduTutor AI (Code Mentor Mode) 💻. You focus on writing clean, efficient, well-documented code, architecture design, and best practices. Always provide complete working examples with comments explaining key lines.""",

    "concept": """You are EduTutor AI (Concept Explainer Mode) 🧠. You specialize in explaining deep concepts using intuitive real-world analogies, mental models, and step-by-step breakdowns before touching any code or math.""",

    "quiz": """You are EduTutor AI (Quiz & Exam Prep Mode) 🧪. You present interactive questions, quizzes, multiple-choice challenges, and test the student's understanding step-by-step, providing immediate constructive feedback."""
}

COMPLEXITY_INSTRUCTIONS = {
    "beginner": "\n\n[Audience Level: Beginner / ELI5]: Explain everything in very simple terms using plain language and relatable everyday analogies. Avoid heavy jargon unless you explain it immediately.",
    "balanced": "\n\n[Audience Level: Balanced]: Provide an approachable yet comprehensive explanation with standard terminology and concrete examples.",
    "advanced": "\n\n[Audience Level: Advanced / Pro]: Provide an in-depth technical analysis, covering low-level mechanics, edge cases, performance trade-offs, and architectural implications."
}

def generate_fallback_offline_response(prompt_text: str) -> str:
    """Provides a helpful structured fallback response when API key is missing or invalid."""
    lower = prompt_text.lower()
    
    if "python" in lower and ("oop" in lower or "class" in lower):
        return """### 🐍 Python Object-Oriented Programming (OOP) Explained

Object-Oriented Programming (OOP) is a paradigm based on the concept of **"Objects"**, which contain **data** (attributes) and **code** (methods).

---

#### 🏛️ 1. The Blueprint Analogy
Think of a **Class** as an architectural blueprint of a house, and an **Object (Instance)** as the actual house built from that blueprint.

```python
class Student:
    # Constructor: initializes new student objects
    def __init__(self, name: str, grade: float):
        self.name = name
        self.grade = grade
        
    # Method: a function that belongs to this object
    def display_report(self) -> str:
        status = "Passing" if self.grade >= 60 else "Needs Improvement"
        return f"Student: {self.name} | Score: {self.grade}% ({status})"

# Creating instances (Objects)
alice = Student("Alice", 92.5)
bob = Student("Bob", 74.0)

print(alice.display_report())
# Output: Student: Alice | Score: 92.5% (Passing)
```

---

#### 🔑 The 4 Pillars of OOP
1. **Encapsulation**: Bundling data and methods together inside a class while hiding private details.
2. **Inheritance**: Creating new classes based on existing ones to reuse code (`class Developer(Employee): ...`).
3. **Polymorphism**: The ability to treat different objects through a common interface (e.g., `.speak()` works on `Dog` and `Cat`).
4. **Abstraction**: Exposing only essential features while hiding the underlying complexity.

---

💡 **Quick Challenge**: How would you add a method `add_bonus(points)` to the `Student` class to increase their score?"""

    elif "machine learning" in lower or "ml" in lower or "neural" in lower:
        return """### 🤖 Machine Learning Demystified

Machine Learning is a subset of AI where computers **learn patterns from data** rather than following explicitly hardcoded rules.

---

#### 📊 The 3 Main Types of Machine Learning

| Paradigm | How It Learns | Real-World Example |
| :--- | :--- | :--- |
| **Supervised Learning** | Learns from labeled inputs & answers $(X \\rightarrow Y)$ | Email Spam Filter, House Price Prediction |
| **Unsupervised Learning** | Finds hidden patterns in unlabeled data | Customer Segmentation, Recommendation Systems |
| **Reinforcement Learning** | Learns via trial-and-error with rewards & penalties | AlphaGo, Self-driving car navigation |

---

#### 🧠 Neural Networks in a Nutshell
A Neural Network consists of layers of interconnected nodes (**neurons**):
1. **Input Layer**: Receives raw features (e.g. image pixels).
2. **Hidden Layers**: Perform non-linear mathematical transformations to extract features (edges $\\rightarrow$ shapes $\\rightarrow$ objects).
3. **Output Layer**: Produces the final prediction (e.g. "Cat: 98%").

```python
# Simple demonstration with scikit-learn
from sklearn.linear_model import LinearRegression
import numpy as np

# Hours studied (X) -> Exam Score (Y)
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([55, 65, 75, 85, 95])

model = LinearRegression()
model.fit(X, y)

predicted_score = model.predict([[6]])
print(f"Predicted score for 6 hours of study: {predicted_score[0]:.1f}")
```

---

💡 **Mini Question**: What is the difference between *overfitting* and *underfitting* in a machine learning model?"""

    else:
        return f"""### 🎓 EduTutor AI Response

Thank you for your question about: **"{prompt_text[:80]}..."**

Here is a structured educational breakdown:

1. **Core Concept**:
   - Every subject can be understood by breaking it down into fundamental first principles.
   
2. **Key Takeaways**:
   - Focus on understanding *why* a concept works rather than just memorizing definitions.
   - Practice with small, focused examples before scaling to complex problems."""


def generate_response(messages: List[Dict[str, str]] | str, mode: str = "default", level: str = "balanced") -> str:
    """
    Generate an intelligent educational response using Groq (LLaMA 3.3 70B).
    Supports conversation history, tutor mode selection, complexity level, and fallback.
    """
    # Extract prompt text
    last_user_text = ""
    if isinstance(messages, str):
        last_user_text = messages
    elif isinstance(messages, list) and len(messages) > 0:
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_text = m.get("content", "")
                break

    sys_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["default"])
    level_instruction = COMPLEXITY_INSTRUCTIONS.get(level, COMPLEXITY_INSTRUCTIONS["balanced"])
    combined_system_prompt = sys_prompt + level_instruction

    # If client is configured, attempt Groq API call
    if client and GROQ_API_KEY and len(GROQ_API_KEY.strip()) > 10:
        try:
            conversation = [{"role": "system", "content": combined_system_prompt}]

            if isinstance(messages, str):
                conversation.append({"role": "user", "content": messages})
            elif isinstance(messages, list):
                # Include recent chat history
                for msg in messages[-12:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role in ["user", "assistant"] and content:
                        conversation.append({"role": role, "content": content})
            else:
                conversation.append({"role": "user", "content": str(messages)})

            response = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=conversation,
                temperature=0.7,
                max_tokens=1800,
                top_p=0.9,
            )

            if response and response.choices:
                return response.choices[0].message.content

        except Exception as e:
            err_str = str(e)
            print(f"Groq API call encountered an error: {err_str[:120]}")
            
            # Fallback to 8b-instant if 70b hits rate limit
            try:
                fallback_response = client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=conversation,
                    temperature=0.7,
                    max_tokens=1200,
                )
                return fallback_response.choices[0].message.content
            except Exception as fb_err:
                if "401" in err_str or "Invalid API Key" in err_str:
                    return generate_fallback_offline_response(last_user_text)
                return f"❌ **Error generating response**: {err_str}\n\n" + generate_fallback_offline_response(last_user_text)

    # Fallback if no valid client
    return generate_fallback_offline_response(last_user_text)
