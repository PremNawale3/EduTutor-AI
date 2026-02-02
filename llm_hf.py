import os
from huggingface_hub import InferenceClient

HF_TOKEN = os.getenv("HF_TOKEN")

client = InferenceClient(
    model="mistralai/Mistral-7B-Instruct-v0.2",
    token=HF_TOKEN
)

def generate_response(prompt):
    response = client.text_generation(
        prompt=prompt,
        max_new_tokens=200,
        temperature=0.7,
        do_sample=True
    )
    return response
