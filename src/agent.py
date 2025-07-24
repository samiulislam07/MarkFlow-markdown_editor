import os
import traceback
import logging
from fastapi import FastAPI, UploadFile, Form
from langchain_community.chat_models import ChatOpenAI
from langgraph.graph import StateGraph, END
from panel import state
from agent_utils import (
    parse_openreview_api_debug as parse_openreview,
    extract_text_from_pdf,
    vectorize,
    query_vector_store
)
from dotenv import load_dotenv
from typing import TypedDict, List, Any
from langchain.chat_models import init_chat_model
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Config
logging.basicConfig(level=logging.INFO)
load_dotenv()
from langgraph.checkpoint.mongodb import AsyncMongoDBSaver
import motor.motor_asyncio
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()

  # CHANGE collection name
os.environ["GOOGLE_API_KEY"] = "AIzaSyChma_wxOBTR-ANTaKglvVHDk0rAwBVKmw"
client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://osamanadeem:LpeGZf9uCGpZWHFy@cse299.sfplar8.mongodb.net/?retryWrites=true&w=majority&appName=cse299")
db = client["markflow"]  # Add this line to define 'db'

async def get_memory():
    return AsyncMongoDBSaver(
        database="markflow",  # ✅ must be string
        collection="checkpoints",
        client=client
    )
# Init
app = FastAPI()
# Note: Ensure your environment is configured to point to the Mistral model endpoint.
# For example, by setting OPENAI_API_BASE and OPENAI_API_KEY.
#llm = ChatOpenAI(model="mistral-7b-instruct-v0.1", temperature=0.1, max_tokens=1000)
llm = init_chat_model("google_genai:gemini-2.0-flash")

# FIX: Define a more explicit state schema using TypedDict.
# This helps LangGraph correctly initialize the state with the input data.
# 'total=False' means not all keys need to be present at all times.

from datetime import datetime

# Save a message
async def save_message(session_id: str, role: str, content: str):
    try:
        collection = db["checkpoints"]
        await collection.insert_one({
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error saving message: {e}")

# Fetch messages for a session
async def fetch_message_history(session_id: str) -> List[dict]:
    try:
        collection = db["checkpoints"]
        cursor = collection.find({"session_id": session_id}).sort("timestamp", 1)
        return await cursor.to_list(length=100)
    except Exception as e:
        print(f"Error fetching message history: {e}")
        return []




class AgentState(TypedDict, total=False):
    """
    Represents the state of our agent.
    """
    openreview_url: str
    query: str
    pdf_bytes: bytes
    reviews: List[dict]
    paper_text: str
    paper_chunks: List[str]  # Replace 'Any' with the actual type from your vectorize function if known
    rebuttal: str
    history: List[dict]
    session_id: str  # Add session_id to track the conversation thread


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
        state['reviews'] = ""
        return state
        #raise ValueError("Missing or empty 'openreview_url' in the state.")

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
    if not state.get("paper_text"):
        return state
    
    chunks = vectorize(state["paper_text"])
    
    if not chunks:
        return state  # No chunks to store, return early

    state['paper_chunks'] = chunks
    return state

async def generate_rebuttal(state: AgentState) -> AgentState:
    """
    Generates the rebuttal using the reviews, user query, and vectorized paper.
    """
    print("---NODE: Generating rebuttal---")
    query = state["query"]
    reviews = state["reviews"]
    matched_excerpts= ""
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False}
    )

    history = state.get("history", [])

    print(history)
    # Prepare conversation history for the LLM
    messages = history + [{"role": "user", "content": query}]

    if state.get("paper_chunks"):
        #matched_excerpts = query_vector_store(query, state["paper_chunks"])
        vectorstore = FAISS.from_texts(state["paper_chunks"], embeddings)
        matched_excerpts = query_vector_store(query, vectorstore)
    
    print(f"Reviews: {reviews}")
    print(f"Matched excerpts: {matched_excerpts}")
    print(f"Query: {query}")

    if(matched_excerpts == "" and reviews == ""):
        prompt = f"""You are an LLM who is to help the user based on their query {query} and do as they ask in a human like manner and use help from previous conversation only if deemed necessary \n\n previous conversation: {messages}"""
    elif(matched_excerpts == "" and reviews != ""):
        prompt = f"""You are an LLM who is to help the user based on their query {query} and do as they ask and previous converstion with AI {messages} and the reviews {reviews}"""
    elif(matched_excerpts != "" and reviews == ""):
        prompt = f"""You are an LLM who is to help the user based on their query {query} and do as they ask and previous converstion with AI {messages} and the matched excerpts {matched_excerpts}"""
    else:
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
    history.append({"role": "user", "content": query})
    history.append({"role": "assistant", "content": result})
    print(f"Updated history: {history}")
    state['rebuttal'] = result
    state['history'] = history 
    session_id = state.get("session_id")
    print(f"Session ID for saving messages: {session_id}")
    if session_id:
        await save_message(session_id, "user", query)   
        await save_message(session_id, "assistant", result)
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

app_graph = graph.compile(checkpointer=memory)

# --- API ROUTE ---
@app.post("/run-agent")
async def run_agent(
    openreview_url: str = Form(...),
    query: str = Form(...),
    pdf: UploadFile = Form(...),
    session_id: str = Form(...)
):
    """
    API endpoint to run the rebuttal generation agent.
    """
    pdf_bytes = await pdf.read()
    history_docs = await fetch_message_history(session_id)
    history = [{"role": doc["role"], "content": doc["content"]} for doc in history_docs]
    print(f"Last state history: {history}")
    
    input_state = {
        "openreview_url": openreview_url,
        "query": query,
        "pdf_bytes": pdf_bytes,
        "history": history,
        "session_id": session_id
    }

    try:
        print(f"---Invoking agent with initial state keys: {list(input_state.keys())}---")
        #result_state = await app_graph.ainvoke(input_state, config={"configurable_id": session_id})
        #result_state = await app_graph.ainvoke(input_state, config={"configurable": {"thread_id": session_id}})
        # result_state = await app_graph.ainvoke(input_state, config={"configurable_id": session_id})
        print(f"Session ID: {session_id}")
        result_state = await app_graph.ainvoke(
            input_state,
            config={
                "configurable": {"thread_id": session_id},
                "configurable_id": session_id
            }
        )

        print("\n---AGENT RUN COMPLETE---")
        print(f"Final state keys: {list(result_state.keys())}")
        
        return {"response": result_state.get("rebuttal", "No rebuttal was generated.")}
    except Exception as e:
        print(f"An error occurred during the agent run: {e}")
        traceback.print_exc()
        return {"error": f"An unexpected error occurred: {str(e)}"}
    
@app.get("/debug/checkpoint")
async def debug_checkpoint(session_id: str):
    collection = db["checkpoints"]
    doc = await collection.find_one(
        {"configurable_id": session_id},
        sort=[("step_index", -1)]
    )
    return doc or {"error": "No checkpoint found"}
