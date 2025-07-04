

import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
import requests
from bs4 import BeautifulSoup
import openreview
import requests
import openreview.api
import time
from typing import List, Dict, Any


# This is the debug function I provided in the last response.
# Make sure to run this specific function to inspect the actual notes and invitations.
def parse_openreview_api_debug(forum_id: str) -> List[Dict[str, Any]]:
    """
    Debug function: Parses OpenReview data and returns a list of dictionaries,
    each representing a reply with extracted ID, Invitation, Cdate, and Content.
    Also prints debug information.
    """
    parsed_replies: List[Dict[str, Any]] = [] # Initialize the list to store results

    try:
        client = openreview.api.OpenReviewClient(baseurl='https://api2.openreview.net')

        submission_note = client.get_note(id=forum_id, details='replies') 

        if not submission_note or 'replies' not in submission_note.details:
            print(f"\n--- Debugging Notes for Forum ID: {forum_id} ---")
            print("No submission note found or no replies in details for this forum ID.")
            return [] # Return empty list if no replies

        print(f"\n--- Debugging Replies for Forum ID: {forum_id} ---")
        all_replies_dicts = submission_note.details['replies']

        if not all_replies_dicts:
            print("No replies found within submission details.")
            return [] # Return empty list if no replies

        for i, reply_dict in enumerate(all_replies_dicts):
            # Convert dictionary to Note object for easier attribute access
            reply = openreview.Note.from_json(reply_dict) 

            # Create a dictionary for the current reply's data
            current_reply_data: Dict[str, Any] = {
                "id": reply.id,
                "invitation": reply.invitation, # This will be None based on your previous output
                "cdate": time.ctime(reply.cdate / 1000) if hasattr(reply, 'cdate') and reply.cdate is not None else "Not available",
                "content": {} # Initialize content dictionary
            }
            
            print(f"\n--- Reply {i+1} ---")
            print(f"ID: {current_reply_data['id']}")
            print(f"Invitation: {current_reply_data['invitation']}")
            print(f"Cdate: {current_reply_data['cdate']}")
            
            if hasattr(reply, 'content') and isinstance(reply.content, dict):
                print(f"Content Keys: {list(reply.content.keys())}")
                # Populate content from the reply's content field
                for key in [ 'review', 'comment', 'summary', 'decision', 
                              'weaknesses', 'questions',
                            'questions_and_comments', 'reason', 'evaluation', 'remarks']: # Expanded content keys
                    if key in reply.content and 'value' in reply.content[key] and reply.content[key]['value'] is not None:
                        val = reply.content[key]['value']
                        # Handle list values (e.g., for checklists or multi-selects)
                        current_reply_data['content'][key] = ", ".join(val) if isinstance(val, list) else val
                        print(f"  {key}: {str(val)[:100]}{'...' if len(str(val)) > 100 else ''}")
            else:
                print("No content dictionary found or content is not a dict.")

            parsed_replies.append(current_reply_data) # Add the processed reply to the list

        print("\n--- End Debugging ---")
        return parsed_replies # Return the list of dictionaries

    except openreview.OpenReviewException as e:
        # Re-raise as a RuntimeError, useful for your agent to catch
        raise RuntimeError(f"OpenReview API error for forum ID {forum_id}: {e}")
    except Exception as e:
        # Re-raise as a RuntimeError for any other unexpected errors
        raise RuntimeError(f"Failed to parse OpenReview API for forum ID {forum_id}: {e}")


#def parse_openreview(forum_id: str) -> str:
    
    try:
        client = openreview.Client(baseurl='https://api2.openreview.net')

        # Get all notes related to the forum ID
        notes = client.get_all_notes(forum=forum_id, sort='tmdate:asc')

        if not notes:
            return "No notes found for this paper."

        relevant_content = []

        # Define common invitation patterns for reviews and related discussions
        # IMPORTANT: These might need to be adjusted based on the specific conference/venue.
        # Use the output from the debug function to confirm.
        review_invitation_patterns = [
            f'ICLR.cc/2024/Conference/-/Official_Review', # For the example URL
            f'ICLR.cc/2024/Conference/-/Public_Comment',
            f'ICLR.cc/2024/Conference/-/Rebuttal',
            f'ICLR.cc/2024/Conference/-/Meta_Review',
            # Add more patterns if needed for other conferences
            # e.g., 'YourVenue.cc/Year/Conference/-/Official_Review'
        ]

        for note in notes:
            # Check if the note's invitation matches any of our target patterns
            is_relevant_note = False
            for pattern in review_invitation_patterns:
                if note.invitation and note.invitation.startswith(pattern):
                    is_relevant_note = True
                    break

            if is_relevant_note and 'content' in note and isinstance(note.content, dict):
                extracted_parts = []

                # Add the type of note
                note_type = note.invitation.split('/')[-1].replace('_', ' ')
                extracted_parts.append(f"### {note_type.replace('-', ' ')} ###") # Format title clearly

                # Add author information if available
                signature = note.get('tauthor', None)
                if signature:
                     extracted_parts.append(f"By: {signature}")
                elif note.signatures: # Sometimes signature is in signatures list
                    # OpenReview signatures can be complex (e.g., '~AnonReviewer1').
                    # Try to get the first one if it looks like an author/group ID.
                    anon_signature = next((s for s in note.signatures if s.startswith('~')), None)
                    if anon_signature:
                        extracted_parts.append(f"By: {anon_signature.replace('~', '')}")

                # Extract common review/comment fields
                content_fields_to_extract = [
                    'rating', 'confidence', 'review', 'comment', 'summary',
                    'evaluation', 'remarks', 'decision', 'strength', 'weakness',
                    'contribution', 'soundness', 'presentation', 'rebuttal'
                ]

                for field in content_fields_to_extract:
                    if field in note.content and 'value' in note.content[field] and note.content[field]['value']:
                        field_value = note.content[field]['value']
                        if isinstance(field_value, list): # Handle cases where value is a list (e.g., checklist)
                            field_value = ", ".join(field_value)
                        extracted_parts.append(f"{field.replace('_', ' ').title()}: {field_value}")

                if extracted_parts:
                    relevant_content.append("\n".join(extracted_parts))

        return "\n\n---\n\n".join(relevant_content) if relevant_content else "No reviews or relevant comments found."

    except openreview.OpenReviewException as e:
        raise RuntimeError(f"OpenReview API error for forum ID {forum_id}: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to parse OpenReview API for forum ID {forum_id}: {e}")

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_text = ""
        for page in doc:
            all_text += page.get_text()
        return all_text.strip()
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {e}")

def vectorize(text: str):
    """
    Chunk and embed the paper text using LangChain + FAISS.
    """
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(text)
        model_name = "all-MiniLM-L6-v2"
        model_kwargs = {'device': 'cpu'} # Use 'cuda' if you have a GPU
        encode_kwargs = {'normalize_embeddings': False}
        embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
        )   # Requires OPENAI_API_KEY env var
        vectorstore = FAISS.from_texts(chunks, embeddings)
        return vectorstore
    except Exception as e:
        raise RuntimeError(f"Vectorization failed: {e}")

def query_vector_store(query: str, vectorstore) -> str:
    """
    Run semantic search on the vector store and return top matched text.
    """
    try:
        results = vectorstore.similarity_search(query, k=5)
        if not results:
            return "No relevant content found in the paper."
        return "\n\n".join([res.page_content for res in results])
    except Exception as e:
        return f"Vector query failed: {e}"
