def generate_response(question: str) -> str:
    q = question.lower()

    if "python" in q and "loop" in q:
        return (
            "Python loops are used to repeat tasks.\n\n"
            "1) for loop → used when number of iterations is known\n"
            "Example:\n"
            "for i in range(5):\n"
            "    print(i)\n\n"
            "2) while loop → runs until a condition becomes false\n"
            "Example:\n"
            "count = 0\n"
            "while count < 5:\n"
            "    count += 1"
        )

    if "machine learning" in q:
        return (
            "Machine Learning is a branch of AI where systems learn from data.\n\n"
            "Types:\n"
            "1) Supervised Learning\n"
            "2) Unsupervised Learning\n"
            "3) Reinforcement Learning"
        )

    if "hello" in q or "hi" in q:
        return "Hello 👋 I am EduTutor AI. Ask me about Python or Machine Learning."

    return (
        "I am EduTutor AI 🤖\n"
        "I can help you with:\n"
        "- Python basics\n"
        "- Machine Learning concepts\n"
        "- Programming fundamentals\n\n"
        "Try asking: Explain Python loops"
    )
