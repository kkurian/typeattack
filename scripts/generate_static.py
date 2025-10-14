#!/usr/bin/env python3
"""
Static JSON File Generation
Generates leaderboard.json and feedback.json files with atomic writes
No external dependencies - uses only standard library
"""

import json
import os
import tempfile
import shutil
from typing import Dict, List, Any, Optional
from datetime import datetime


def ensure_directory_exists(filepath: str) -> None:
    """
    Ensure the directory for a file path exists

    Args:
        filepath: File path to check
    """
    directory = os.path.dirname(filepath)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)


def atomic_write_json(filepath: str, data: Any, indent: int = 2) -> bool:
    """
    Write JSON data to file atomically (write to temp, then rename)

    Args:
        filepath: Target file path
        data: Data to write (will be JSON encoded)
        indent: JSON indentation level

    Returns:
        True if successful
    """
    try:
        # Ensure directory exists
        ensure_directory_exists(filepath)

        # Create temp file in same directory (for atomic rename)
        directory = os.path.dirname(filepath) or '.'
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.tmp',
            prefix='.',
            dir=directory,
            delete=False
        ) as tmp_file:
            json.dump(data, tmp_file, indent=indent, sort_keys=True)
            tmp_name = tmp_file.name

        # Atomic rename (on same filesystem)
        shutil.move(tmp_name, filepath)
        return True

    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        # Clean up temp file if it exists
        if 'tmp_name' in locals() and os.path.exists(tmp_name):
            try:
                os.remove(tmp_name)
            except:
                pass
        return False


def load_json_safe(filepath: str, default: Any = None) -> Any:
    """
    Safely load JSON from file, returning default if file doesn't exist

    Args:
        filepath: File path to load from
        default: Default value if file doesn't exist or is invalid

    Returns:
        Parsed JSON data or default value
    """
    if not os.path.exists(filepath):
        return default

    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return default


def generate_leaderboard(
    scores: List[Dict[str, Any]],
    existing_path: str = 'data/leaderboard.json',
    max_scores: int = 50
) -> Dict[str, Any]:
    """
    Generate leaderboard JSON data

    Args:
        scores: List of score submissions
        existing_path: Path to existing leaderboard file
        max_scores: Maximum number of scores to keep

    Returns:
        Generated leaderboard data
    """
    # Load existing leaderboard
    existing = load_json_safe(existing_path, {'version': 1, 'scores': []})

    # Merge new scores with existing
    all_scores = existing.get('scores', []) + scores

    # Remove duplicates by sessionHash (keep first occurrence)
    seen_hashes = set()
    unique_scores = []
    for score in all_scores:
        hash_val = score.get('sessionHash')
        if hash_val and hash_val not in seen_hashes:
            seen_hashes.add(hash_val)
            unique_scores.append(score)

    # Sort by WPM descending, then by timestamp ascending (earlier is better)
    unique_scores.sort(
        key=lambda s: (-s.get('wpm', 0), s.get('timestamp', 0))
    )

    # Take top scores
    top_scores = unique_scores[:max_scores]

    # Assign ranks
    for i, score in enumerate(top_scores, 1):
        score['rank'] = i

    # Create leaderboard data
    leaderboard = {
        'version': 1,
        'generated': int(datetime.now().timestamp() * 1000),  # Unix timestamp in ms
        'scores': top_scores
    }

    return leaderboard


def generate_feedback(
    feedback_items: List[Dict[str, Any]],
    existing_path: str = 'data/feedback.json'
) -> Dict[str, Any]:
    """
    Generate feedback JSON data

    Args:
        feedback_items: List of feedback submissions
        existing_path: Path to existing feedback file

    Returns:
        Generated feedback data
    """
    # Load existing feedback
    existing = load_json_safe(existing_path, {'version': 1, 'items': []})

    # Merge new items with existing
    all_items = existing.get('items', []) + feedback_items

    # Remove duplicates by feedbackId (keep first occurrence)
    seen_ids = set()
    unique_items = []
    for item in all_items:
        item_id = item.get('feedbackId') or item.get('id')
        if item_id and item_id not in seen_ids:
            seen_ids.add(item_id)
            unique_items.append(item)

    # Sort by votes descending, then by timestamp descending (newer first)
    unique_items.sort(
        key=lambda f: (-f.get('votes', 0), -f.get('timestamp', 0))
    )

    # Create feedback data
    feedback = {
        'version': 1,
        'generated': int(datetime.now().timestamp() * 1000),  # Unix timestamp in ms
        'items': unique_items
    }

    return feedback


def generate_replay_file(
    session_data: Dict[str, Any],
    metadata: Dict[str, Any],
    votes: Optional[Dict[str, int]] = None,
    output_dir: str = 'data/replays'
) -> bool:
    """
    Generate individual replay JSON file

    Args:
        session_data: Complete session data
        metadata: Metadata (userId, initials, wpm, etc.)
        votes: Vote counts (up, flags)
        output_dir: Directory to write replay files

    Returns:
        True if successful
    """
    session_hash = session_data.get('sessionHash')
    if not session_hash:
        print("Error: Session data missing sessionHash")
        return False

    # Create replay data structure
    replay_data = {
        'sessionHash': session_hash,
        'version': 1,
        'metadata': metadata,
        'gameState': session_data,
        'votes': votes or {'up': 0, 'flags': 0}
    }

    # Write to file
    filepath = os.path.join(output_dir, f"{session_hash}.json")
    return atomic_write_json(filepath, replay_data)


def validate_leaderboard_schema(data: Dict[str, Any]) -> List[str]:
    """
    Validate leaderboard.json schema

    Args:
        data: Leaderboard data to validate

    Returns:
        List of validation errors (empty if valid)
    """
    errors = []

    if not isinstance(data, dict):
        errors.append("Leaderboard must be an object")
        return errors

    # Check required fields
    if 'version' not in data:
        errors.append("Missing 'version' field")
    elif data['version'] != 1:
        errors.append(f"Unknown version: {data['version']}")

    if 'generated' not in data:
        errors.append("Missing 'generated' timestamp")
    elif not isinstance(data['generated'], (int, float)):
        errors.append("'generated' must be a number")

    if 'scores' not in data:
        errors.append("Missing 'scores' array")
    elif not isinstance(data['scores'], list):
        errors.append("'scores' must be an array")
    else:
        # Validate each score
        for i, score in enumerate(data['scores']):
            if not isinstance(score, dict):
                errors.append(f"Score {i} must be an object")
                continue

            # Check required score fields
            required_fields = ['rank', 'sessionHash', 'userId', 'initials', 'wpm', 'accuracy', 'stage']
            for field in required_fields:
                if field not in score:
                    errors.append(f"Score {i} missing required field: {field}")

    return errors


def validate_feedback_schema(data: Dict[str, Any]) -> List[str]:
    """
    Validate feedback.json schema

    Args:
        data: Feedback data to validate

    Returns:
        List of validation errors (empty if valid)
    """
    errors = []

    if not isinstance(data, dict):
        errors.append("Feedback must be an object")
        return errors

    # Check required fields
    if 'version' not in data:
        errors.append("Missing 'version' field")
    elif data['version'] != 1:
        errors.append(f"Unknown version: {data['version']}")

    if 'generated' not in data:
        errors.append("Missing 'generated' timestamp")

    if 'items' not in data:
        errors.append("Missing 'items' array")
    elif not isinstance(data['items'], list):
        errors.append("'items' must be an array")
    else:
        # Validate each item
        for i, item in enumerate(data['items']):
            if not isinstance(item, dict):
                errors.append(f"Feedback item {i} must be an object")
                continue

            # Check required fields
            required_fields = ['id', 'type', 'description', 'userId']
            for field in required_fields:
                if field not in item and f'{field}Id' not in item:
                    errors.append(f"Feedback item {i} missing required field: {field}")

            # Validate type
            if 'type' in item and item['type'] not in ['bug', 'feature']:
                errors.append(f"Feedback item {i} has invalid type: {item['type']}")

    return errors


def test_generation():
    """Test JSON generation with sample data"""
    # Test leaderboard generation
    sample_scores = [
        {
            'sessionHash': 'abc123',
            'userId': 'user-uuid-1',
            'initials': 'ABC',
            'wpm': 145,
            'accuracy': 98.5,
            'stage': 3,
            'timestamp': 1705161200000,
            'votes': {'up': 5, 'flags': 0},
            'replayUrl': 'data/replays/abc123.json'
        },
        {
            'sessionHash': 'def456',
            'userId': 'user-uuid-2',
            'initials': 'DEF',
            'wpm': 130,
            'accuracy': 95.0,
            'stage': 2,
            'timestamp': 1705161300000,
            'votes': {'up': 3, 'flags': 0},
            'replayUrl': 'data/replays/def456.json'
        }
    ]

    leaderboard = generate_leaderboard(sample_scores)
    errors = validate_leaderboard_schema(leaderboard)

    if errors:
        print(f"✗ Leaderboard validation errors: {errors}")
    else:
        print("✓ Leaderboard generation successful")
        print(f"  Generated {len(leaderboard['scores'])} scores")

    # Test feedback generation
    sample_feedback = [
        {
            'feedbackId': 'feedback-uuid-1',
            'type': 'bug',
            'description': 'Words overlapping',
            'userId': 'user-uuid-1',
            'timestamp': 1705161200000,
            'votes': 5,
            'status': 'open'
        }
    ]

    feedback = generate_feedback(sample_feedback)
    errors = validate_feedback_schema(feedback)

    if errors:
        print(f"✗ Feedback validation errors: {errors}")
    else:
        print("✓ Feedback generation successful")
        print(f"  Generated {len(feedback['items'])} items")


if __name__ == "__main__":
    test_generation()