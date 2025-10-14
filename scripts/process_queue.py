#!/usr/bin/env python3
"""
Main Queue Processing Script
Fetches submissions from Cloudflare KV, validates them, and generates static JSON files
Run by GitHub Actions every 15 minutes
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# Import our modules
from cloudflare_kv import get_client_from_env
from validate_session import validate_submission, verify_hash
from generate_static import (
    generate_leaderboard,
    generate_feedback,
    generate_replay_file,
    atomic_write_json,
    load_json_safe
)


def fetch_queue_items(kv_client, prefix: str = "queue:") -> List[tuple[str, Dict]]:
    """
    Fetch all queue items from Cloudflare KV

    Args:
        kv_client: CloudflareKV client instance
        prefix: Key prefix to filter by

    Returns:
        List of (key, value) tuples
    """
    print(f"Fetching queue items with prefix '{prefix}'...")

    keys = kv_client.list_keys(prefix=prefix)
    print(f"Found {len(keys)} queue items")

    items = []
    for key in keys:
        value = kv_client.get_value(key)
        if value:
            items.append((key, value))
        else:
            print(f"Warning: Key {key} has no value")

    return items


def fetch_feedback_items(kv_client, prefix: str = "feedback:") -> List[tuple[str, Dict]]:
    """
    Fetch all feedback items from Cloudflare KV

    Args:
        kv_client: CloudflareKV client instance
        prefix: Key prefix to filter by

    Returns:
        List of (key, value) tuples
    """
    print(f"Fetching feedback items with prefix '{prefix}'...")

    keys = kv_client.list_keys(prefix=prefix)
    print(f"Found {len(keys)} feedback items")

    items = []
    for key in keys:
        value = kv_client.get_value(key)
        if value:
            items.append((key, value))
        else:
            print(f"Warning: Key {key} has no value")

    return items


def fetch_vote_counts(kv_client, session_hashes: List[str]) -> Dict[str, Dict[str, int]]:
    """
    Fetch and aggregate vote counts for given session hashes

    Args:
        kv_client: CloudflareKV client instance
        session_hashes: List of session hashes to get votes for

    Returns:
        Dictionary mapping session hash to vote counts
    """
    vote_counts = {}

    for hash_val in session_hashes:
        # Fetch all votes for this hash
        vote_keys = kv_client.list_keys(prefix=f"vote:{hash_val}:")

        up_votes = 0
        flag_votes = 0

        for key in vote_keys:
            vote_data = kv_client.get_value(key)
            if vote_data and isinstance(vote_data, dict):
                vote_type = vote_data.get('voteType')
                if vote_type == 'up':
                    up_votes += 1
                elif vote_type == 'flag':
                    flag_votes += 1

        vote_counts[hash_val] = {
            'up': up_votes,
            'flags': flag_votes
        }

    return vote_counts


def fetch_feedback_vote_counts(kv_client, feedback_ids: List[str]) -> Dict[str, int]:
    """
    Fetch and aggregate feedback vote counts

    Args:
        kv_client: CloudflareKV client instance
        feedback_ids: List of feedback IDs to get votes for

    Returns:
        Dictionary mapping feedback ID to vote count
    """
    vote_counts = {}

    for feedback_id in feedback_ids:
        # Fetch all votes for this feedback
        vote_keys = kv_client.list_keys(prefix=f"feedback-vote:{feedback_id}:")
        vote_counts[feedback_id] = len(vote_keys)

    return vote_counts


def process_score_submissions(
    queue_items: List[tuple[str, Dict]],
    kv_client
) -> List[Dict[str, Any]]:
    """
    Process and validate score submissions

    Args:
        queue_items: List of (key, submission_data) tuples
        kv_client: CloudflareKV client for additional operations

    Returns:
        List of valid score objects
    """
    valid_scores = []
    processed_keys = []

    # Load existing leaderboard to check for duplicates
    existing_leaderboard = load_json_safe('data/leaderboard.json', {'scores': []})
    existing_hashes = {score['sessionHash'] for score in existing_leaderboard.get('scores', [])}

    for key, submission in queue_items:
        print(f"\nProcessing {key}...")

        # Skip if not a score submission
        if submission.get('type') != 'score' and 'sessionData' in submission:
            submission['type'] = 'score'  # Assume score if has sessionData

        if submission.get('type') != 'score':
            continue

        # Validate submission
        is_valid, errors = validate_submission(submission)

        if not is_valid:
            print(f"  ✗ Validation failed: {errors}")
            processed_keys.append(key)  # Mark for deletion anyway
            continue

        session_hash = submission.get('sessionHash')

        # Check for duplicate
        if session_hash in existing_hashes:
            print(f"  ✗ Duplicate session hash: {session_hash}")
            processed_keys.append(key)
            continue

        # Extract score data
        session_data = submission.get('sessionData', {})
        stats = session_data.get('stats', {})

        score_obj = {
            'sessionHash': session_hash,
            'userId': submission.get('userId'),
            'initials': submission.get('initials'),
            'wpm': stats.get('wpm', 0),
            'accuracy': stats.get('accuracy', 0),
            'stage': session_data.get('stage', 0),
            'timestamp': submission.get('timestamp', int(datetime.now().timestamp() * 1000)),
            'votes': {'up': 0, 'flags': 0},  # Will be updated with actual counts
            'replayUrl': f'data/replays/{session_hash}.json'
        }

        valid_scores.append(score_obj)
        processed_keys.append(key)
        existing_hashes.add(session_hash)  # Prevent duplicates within this batch

        # Generate replay file
        metadata = {
            'userId': score_obj['userId'],
            'initials': score_obj['initials'],
            'wpm': score_obj['wpm'],
            'accuracy': score_obj['accuracy'],
            'stage': score_obj['stage'],
            'duration': session_data.get('duration', 0),
            'timestamp': score_obj['timestamp']
        }

        if generate_replay_file(session_data, metadata):
            print(f"  ✓ Generated replay file for {session_hash}")
        else:
            print(f"  ⚠ Failed to generate replay file for {session_hash}")

    # Fetch vote counts for all valid scores
    if valid_scores:
        session_hashes = [score['sessionHash'] for score in valid_scores]
        vote_counts = fetch_vote_counts(kv_client, session_hashes)

        # Update scores with vote counts
        for score in valid_scores:
            if score['sessionHash'] in vote_counts:
                score['votes'] = vote_counts[score['sessionHash']]

    # Delete processed items from queue
    for key in processed_keys:
        if kv_client.delete_key(key):
            print(f"  ✓ Deleted {key} from queue")
        else:
            print(f"  ⚠ Failed to delete {key}")

    print(f"\nProcessed {len(valid_scores)} valid scores")
    return valid_scores


def process_feedback_submissions(
    feedback_items: List[tuple[str, Dict]],
    kv_client
) -> List[Dict[str, Any]]:
    """
    Process feedback submissions

    Args:
        feedback_items: List of (key, feedback_data) tuples
        kv_client: CloudflareKV client for additional operations

    Returns:
        List of valid feedback objects
    """
    valid_feedback = []
    processed_keys = []

    for key, feedback in feedback_items:
        print(f"\nProcessing feedback {key}...")

        # Validate basic structure
        if not feedback.get('userId'):
            print(f"  ✗ Missing userId")
            processed_keys.append(key)
            continue

        if not feedback.get('description'):
            print(f"  ✗ Missing description")
            processed_keys.append(key)
            continue

        # Create feedback object
        feedback_obj = {
            'id': feedback.get('feedbackId', key.split(':')[-1]),  # Use UUID from key if no ID
            'type': feedback.get('type', 'feedback'),
            'description': feedback.get('description'),
            'userId': feedback.get('userId'),
            'timestamp': feedback.get('timestamp', int(datetime.now().timestamp() * 1000)),
            'votes': 0,  # Will be updated with actual count
            'status': feedback.get('status', 'open')
        }

        # Add game context if present
        if 'gameContext' in feedback:
            feedback_obj['context'] = {
                'stage': feedback['gameContext'].get('stage'),
                'wpm': feedback['gameContext'].get('wpm'),
                'accuracy': feedback['gameContext'].get('accuracy')
            }

        valid_feedback.append(feedback_obj)
        processed_keys.append(key)

    # Fetch vote counts for all feedback
    if valid_feedback:
        feedback_ids = [f['id'] for f in valid_feedback]
        vote_counts = fetch_feedback_vote_counts(kv_client, feedback_ids)

        # Update feedback with vote counts
        for feedback in valid_feedback:
            if feedback['id'] in vote_counts:
                feedback['votes'] = vote_counts[feedback['id']]

    # Delete processed items from queue
    for key in processed_keys:
        if kv_client.delete_key(key):
            print(f"  ✓ Deleted {key} from queue")
        else:
            print(f"  ⚠ Failed to delete {key}")

    print(f"\nProcessed {len(valid_feedback)} feedback items")
    return valid_feedback


def main():
    """Main processing function"""
    print("="*60)
    print("LEADERBOARD QUEUE PROCESSOR")
    print(f"Started at: {datetime.now().isoformat()}")
    print("="*60)

    try:
        # Initialize Cloudflare KV client
        print("\nInitializing Cloudflare KV client...")
        kv_client = get_client_from_env()
        print("✓ KV client initialized")

        # Fetch queue items
        queue_items = fetch_queue_items(kv_client, prefix="queue:")

        # Process score submissions
        new_scores = []
        if queue_items:
            new_scores = process_score_submissions(queue_items, kv_client)

        # Generate/update leaderboard
        if new_scores or not os.path.exists('data/leaderboard.json'):
            print("\nGenerating leaderboard...")
            leaderboard = generate_leaderboard(new_scores)

            if atomic_write_json('data/leaderboard.json', leaderboard):
                print(f"✓ Leaderboard updated with {len(leaderboard['scores'])} total scores")
            else:
                print("✗ Failed to write leaderboard.json")
                sys.exit(1)
        else:
            print("\nNo new scores to process")

        # Fetch and process feedback items
        feedback_items = fetch_feedback_items(kv_client, prefix="feedback:")

        new_feedback = []
        if feedback_items:
            new_feedback = process_feedback_submissions(feedback_items, kv_client)

        # Generate/update feedback
        if new_feedback or not os.path.exists('data/feedback.json'):
            print("\nGenerating feedback list...")
            feedback = generate_feedback(new_feedback)

            if atomic_write_json('data/feedback.json', feedback):
                print(f"✓ Feedback updated with {len(feedback['items'])} total items")
            else:
                print("✗ Failed to write feedback.json")
                sys.exit(1)
        else:
            print("\nNo new feedback to process")

        print("\n" + "="*60)
        print("PROCESSING COMPLETE")
        print(f"Finished at: {datetime.now().isoformat()}")
        print("="*60)

    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()