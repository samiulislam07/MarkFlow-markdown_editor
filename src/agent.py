import os
import fitz  # PyMuPDF
import traceback
import logging
from fastapi import FastAPI, UploadFile, Form
from langchain_community.chat_models import ChatOpenAI
from langgraph.graph import StateGraph, END
from agent_utils import (
    parse_openreview_api_debug as parse_openreview,
    extract_text_from_pdf,
    vectorize,
    query_vector_store
)
from dotenv import load_dotenv
from typing import TypedDict, List, Any
from langchain.chat_models import init_chat_model

# Config
logging.basicConfig(level=logging.INFO)
load_dotenv()

os.environ["GOOGLE_API_KEY"] = "AIzaSyChma_wxOBTR-ANTaKglvVHDk0rAwBVKmw"

# Init
app = FastAPI()
# Note: Ensure your environment is configured to point to the Mistral model endpoint.
# For example, by setting OPENAI_API_BASE and OPENAI_API_KEY.
#llm = ChatOpenAI(model="mistral-7b-instruct-v0.1", temperature=0.1, max_tokens=1000)
llm = init_chat_model("google_genai:gemini-2.0-flash")

# FIX: Define a more explicit state schema using TypedDict.
# This helps LangGraph correctly initialize the state with the input data.
# 'total=False' means not all keys need to be present at all times.
class AgentState(TypedDict, total=False):
    """
    Represents the state of our agent.
    """
    openreview_url: str
    query: str
    pdf_bytes: bytes
    reviews: List[dict]
    paper_text: str
    vector_chunks: Any  # Replace 'Any' with the actual type from your vectorize function if known
    rebuttal: str


# --- NODE FUNCTIONS (ASYNC) ---

async def scrape_reviews(state: AgentState) -> AgentState:
    """
    Scrapes reviews from the provided OpenReview URL.
    """
    print("---NODE: Scraping reviews---")
    print(f"Current state keys: {list(state.keys())}")

    openreview_url = state.get("openreview_url")

    forum_id = openreview_url.split('id=')[-1]
    print(f"Extracted forum ID for API call: {forum_id}")

    if not openreview_url:
        raise ValueError("Missing or empty 'openreview_url' in the state.")

    print(f"Scraping reviews from: {forum_id}")
    reviews = parse_openreview(forum_id)
    print(f"Extracted reviews: {reviews}")
    state['reviews'] = reviews
    return state

async def parse_pdf(state: AgentState) -> AgentState:
    """
    Extracts text from the PDF file bytes.
    """
    print("---NODE: Parsing PDF---")
    text = extract_text_from_pdf(state["pdf_bytes"])
    state['paper_text'] = text
    return state

async def vectorize_paper(state: AgentState) -> AgentState:
    """
    Vectorizes the paper's text content.
    """
    print("---NODE: Vectorizing paper---")
    chunks = vectorize(state["paper_text"])
    state['vector_chunks'] = chunks
    return state

async def generate_rebuttal(state: AgentState) -> AgentState:
    """
    Generates the rebuttal using the reviews, user query, and vectorized paper.
    """
    print("---NODE: Generating rebuttal---")
    query = state["query"]
    reviews = state["reviews"]
    matched_excerpts = query_vector_store(query, state["vector_chunks"])
    
    print(f"Reviews: {reviews}")
    print(f"Matched excerpts: {matched_excerpts}")
    print(f"Query: {query}")

    prompt = f"""You are a research assistant helping to draft a rebuttal for a scientific paper.
    
    Here are the reviews from the conference:
    ---
    {reviews}
    ---
    
    To address a specific point raised by the reviewers, here are relevant excerpts from our paper:
    ---
    {matched_excerpts}
    ---

    Based on the reviews and the provided excerpts, please draft a polite and professional rebuttal addressing the reviewers' concerns in MARKDOWN format.
    """

    print("Generating rebuttal from prompt...")
    try:
        result = await llm.apredict(prompt)
        print(prompt)
        print(f"LLM response: {result}")
    except Exception as e:
        print(f"LLM generation failed: {e}")
        traceback.print_exc()
        result = "⚠️ Error: Could not generate the rebuttal due to an LLM failure."

    state['rebuttal'] = result
    return state

# --- GRAPH SETUP ---
graph = StateGraph(AgentState)

graph.add_node("scrape", scrape_reviews)
graph.add_node("parse_pdf", parse_pdf)
graph.add_node("vectorize", vectorize_paper)
graph.add_node("generate", generate_rebuttal)

graph.set_entry_point("scrape")
graph.add_edge("scrape", "parse_pdf")
graph.add_edge("parse_pdf", "vectorize")
graph.add_edge("vectorize", "generate")
graph.add_edge("generate", END)

app_graph = graph.compile()

# --- API ROUTE ---
@app.post("/run-agent")
async def run_agent(
    openreview_url: str = Form(...),
    query: str = Form(...),
    pdf: UploadFile = Form(...)
):
    """
    API endpoint to run the rebuttal generation agent.
    """
    pdf_bytes = await pdf.read()
    
    input_state = {
        "openreview_url": openreview_url,
        "query": query,
        "pdf_bytes": pdf_bytes,
    }

    try:
        print(f"---Invoking agent with initial state keys: {list(input_state.keys())}---")
        result_state = await app_graph.ainvoke(input_state)
        
        print("\n---AGENT RUN COMPLETE---")
        print(f"Final state keys: {list(result_state.keys())}")
        
        return {"response": result_state.get("rebuttal", "No rebuttal was generated.")}
    except Exception as e:
        print(f"An error occurred during the agent run: {e}")
        traceback.print_exc()
        return {"error": f"An unexpected error occurred: {str(e)}"}
