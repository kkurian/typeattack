#!/usr/bin/env python3
"""
Session Hash Validation
Recalculates SHA-256 hash from session data to verify integrity
No external dependencies - uses only standard library
"""

import hashlib
import json
from typing import Dict, List, Any


def extract_deterministic_data(session_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract deterministic subset of session data for hashing
    Must match the client-side implementation exactly

    Args:
        session_data: Complete session data

    Returns:
        Deterministic subset for hashing
    """
    deterministic = {
        'seed': session_data.get('seed'),
        'stage': session_data.get('stage'),
        'words': [],
        'keystrokes': []
    }

    # Extract word texts in sorted order
    words = session_data.get('words', [])
    if isinstance(words, list):
        word_texts = [w.get('text', '') for w in words if w.get('text')]
        deterministic['words'] = sorted(word_texts)  # Sort alphabetically

    # Extract keystrokes with deterministic fields only
    keystrokes = session_data.get('keystrokes', [])
    if isinstance(keystrokes, list):
        deterministic['keystrokes'] = [
            {
                'key': k.get('key'),
                'timestamp': k.get('timestamp'),
                'wordIndex': k.get('wordIndex')
            }
            for k in keystrokes
        ]

    return deterministic


def calculate_hash(session_data: Dict[str, Any]) -> str:
    """
    Calculate SHA-256 hash of session data

    Args:
        session_data: Complete session data

    Returns:
        SHA-256 hash as hex string (lowercase)
    """
    # Extract deterministic data
    deterministic_data = extract_deterministic_data(session_data)

    # Create stable JSON string (no indentation, no spaces)
    json_string = json.dumps(deterministic_data, separators=(',', ':'), sort_keys=True)

    # Calculate SHA-256 hash
    hash_object = hashlib.sha256(json_string.encode('utf-8'))
    return hash_object.hexdigest()


def verify_hash(session_data: Dict[str, Any], expected_hash: str) -> bool:
    """
    Verify session hash matches the session data

    Args:
        session_data: Complete session data
        expected_hash: Hash to verify against

    Returns:
        True if hash matches
    """
    if not expected_hash or not isinstance(expected_hash, str):
        return False

    try:
        calculated_hash = calculate_hash(session_data)
        # Compare case-insensitively
        return calculated_hash.lower() == expected_hash.lower()
    except Exception as e:
        print(f"Hash verification error: {e}")
        return False


def validate_session_data(session_data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """
    Validate session data structure and values

    Args:
        session_data: Session data to validate

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []

    # Check required fields
    required_fields = ['seed', 'stage', 'words', 'keystrokes']
    for field in required_fields:
        if field not in session_data:
            errors.append(f"Missing required field: {field}")

    # Validate seed
    seed = session_data.get('seed')
    if seed is not None and not isinstance(seed, (int, float)):
        errors.append("Seed must be a number")

    # Validate stage
    stage = session_data.get('stage')
    if stage is not None:
        if not isinstance(stage, (int, float)):
            errors.append("Stage must be a number")
        elif stage < 1:
            errors.append("Stage must be at least 1")

    # Validate words array
    words = session_data.get('words')
    if words is not None:
        if not isinstance(words, list):
            errors.append("Words must be an array")
        elif len(words) == 0:
            errors.append("Words array cannot be empty")
        else:
            for i, word in enumerate(words):
                if not isinstance(word, dict):
                    errors.append(f"Word {i} must be an object")
                elif not word.get('text'):
                    errors.append(f"Word {i} missing text field")

    # Validate keystrokes array
    keystrokes = session_data.get('keystrokes')
    if keystrokes is not None:
        if not isinstance(keystrokes, list):
            errors.append("Keystrokes must be an array")
        elif len(keystrokes) == 0:
            errors.append("Keystrokes array cannot be empty")
        else:
            for i, keystroke in enumerate(keystrokes):
                if not isinstance(keystroke, dict):
                    errors.append(f"Keystroke {i} must be an object")
                    continue

                if not keystroke.get('key'):
                    errors.append(f"Keystroke {i} missing key field")
                if keystroke.get('timestamp') is None:
                    errors.append(f"Keystroke {i} missing timestamp")
                if keystroke.get('wordIndex') is None:
                    errors.append(f"Keystroke {i} missing wordIndex")

    # Validate stats if present
    stats = session_data.get('stats')
    if stats:
        wpm = stats.get('wpm')
        if wpm is not None:
            if not isinstance(wpm, (int, float)):
                errors.append("WPM must be a number")
            elif wpm < 0 or wpm > 300:
                errors.append(f"WPM {wpm} is outside reasonable range (0-300)")

        accuracy = stats.get('accuracy')
        if accuracy is not None:
            if not isinstance(accuracy, (int, float)):
                errors.append("Accuracy must be a number")
            elif accuracy < 0 or accuracy > 100:
                errors.append(f"Accuracy {accuracy} must be between 0 and 100")

    return len(errors) == 0, errors


def validate_submission(submission: Dict[str, Any]) -> tuple[bool, List[str]]:
    """
    Validate a complete score submission including hash

    Args:
        submission: Complete submission data

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []

    # Check for session data and hash
    session_data = submission.get('sessionData')
    session_hash = submission.get('sessionHash')

    if not session_data:
        errors.append("Missing sessionData")
        return False, errors

    if not session_hash:
        errors.append("Missing sessionHash")
        return False, errors

    # Validate session data structure
    is_valid, data_errors = validate_session_data(session_data)
    errors.extend(data_errors)

    # Verify hash if data is structurally valid
    if is_valid:
        if not verify_hash(session_data, session_hash):
            errors.append("Session hash does not match session data")

    # Check user identity fields
    if not submission.get('userId'):
        errors.append("Missing userId")
    elif not is_valid_uuid(submission.get('userId')):
        errors.append("Invalid userId format (must be UUIDv4)")

    initials = submission.get('initials')
    if not initials:
        errors.append("Missing initials")
    elif not isinstance(initials, str) or len(initials) != 3 or not initials.isupper():
        errors.append("Initials must be exactly 3 uppercase letters")

    return len(errors) == 0, errors


def is_valid_uuid(uuid_string: str) -> bool:
    """
    Check if string is a valid UUIDv4

    Args:
        uuid_string: String to validate

    Returns:
        True if valid UUIDv4 format
    """
    if not uuid_string or not isinstance(uuid_string, str):
        return False

    # Basic UUIDv4 pattern check
    import re
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_string.lower()))


def test_validation():
    """Test validation with sample data"""
    sample_session = {
        'seed': 12345,
        'stage': 3,
        'words': [
            {'text': 'hello', 'spawnTime': 0, 'completedTime': 2000},
            {'text': 'world', 'spawnTime': 1000, 'completedTime': 3000}
        ],
        'keystrokes': [
            {'key': 'h', 'timestamp': 1000, 'wordIndex': 0},
            {'key': 'e', 'timestamp': 1100, 'wordIndex': 0}
        ],
        'stats': {
            'wpm': 120,
            'accuracy': 95.5
        }
    }

    # Calculate hash
    hash_value = calculate_hash(sample_session)
    print(f"Sample hash: {hash_value}")

    # Verify hash
    is_valid = verify_hash(sample_session, hash_value)
    print(f"Hash verification: {'✓ Valid' if is_valid else '✗ Invalid'}")

    # Validate structure
    is_valid, errors = validate_session_data(sample_session)
    if is_valid:
        print("✓ Session data structure valid")
    else:
        print(f"✗ Validation errors: {errors}")


if __name__ == "__main__":
    test_validation()