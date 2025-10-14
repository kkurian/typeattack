#!/usr/bin/env python3
"""
Score Moderation Tooling
Lists flagged scores and supports manual deletion workflow
No external dependencies - uses only standard library
"""

import json
import os
import sys
from typing import Dict, List, Any, Optional
from datetime import datetime


def load_leaderboard(filepath: str = 'data/leaderboard.json') -> Dict[str, Any]:
    """
    Load leaderboard data from JSON file

    Args:
        filepath: Path to leaderboard.json

    Returns:
        Leaderboard data or empty structure
    """
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found")
        return {'version': 1, 'scores': []}

    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return {'version': 1, 'scores': []}


def save_leaderboard(data: Dict[str, Any], filepath: str = 'data/leaderboard.json') -> bool:
    """
    Save leaderboard data to JSON file

    Args:
        data: Leaderboard data to save
        filepath: Path to save to

    Returns:
        True if successful
    """
    try:
        # Update generated timestamp
        data['generated'] = int(datetime.now().timestamp() * 1000)

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, sort_keys=True)
        return True
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        return False


def list_flagged_scores(
    leaderboard: Dict[str, Any],
    flag_threshold: int = 3
) -> List[Dict[str, Any]]:
    """
    List all scores with flags above threshold

    Args:
        leaderboard: Leaderboard data
        flag_threshold: Minimum flag count to consider flagged

    Returns:
        List of flagged scores
    """
    flagged = []

    for score in leaderboard.get('scores', []):
        votes = score.get('votes', {})
        flags = votes.get('flags', 0)

        if flags >= flag_threshold:
            flagged.append({
                'rank': score.get('rank'),
                'sessionHash': score.get('sessionHash'),
                'userId': score.get('userId'),
                'initials': score.get('initials'),
                'wpm': score.get('wpm'),
                'accuracy': score.get('accuracy'),
                'stage': score.get('stage'),
                'flags': flags,
                'upvotes': votes.get('up', 0)
            })

    return flagged


def print_flagged_scores(flagged: List[Dict[str, Any]]) -> None:
    """
    Print flagged scores in a readable format

    Args:
        flagged: List of flagged scores
    """
    if not flagged:
        print("No flagged scores found.")
        return

    print("\n" + "="*80)
    print("FLAGGED SCORES FOR REVIEW")
    print("="*80)

    for score in flagged:
        print(f"\nRank #{score['rank']}")
        print(f"  User: {score['initials']} ({score['userId'][:8]}...)")
        print(f"  Performance: {score['wpm']} WPM, {score['accuracy']}% accuracy, Stage {score['stage']}")
        print(f"  Votes: {score['upvotes']} 👍 / {score['flags']} 🚩")
        print(f"  Session Hash: {score['sessionHash']}")
        print("-"*40)

    print(f"\nTotal flagged scores: {len(flagged)}")


def delete_score_by_hash(
    leaderboard: Dict[str, Any],
    session_hash: str
) -> bool:
    """
    Delete a score from the leaderboard by session hash

    Args:
        leaderboard: Leaderboard data (modified in place)
        session_hash: Session hash to delete

    Returns:
        True if score was found and deleted
    """
    scores = leaderboard.get('scores', [])
    original_count = len(scores)

    # Filter out the score with matching hash
    leaderboard['scores'] = [
        score for score in scores
        if score.get('sessionHash') != session_hash
    ]

    # Re-rank remaining scores
    for i, score in enumerate(leaderboard['scores'], 1):
        score['rank'] = i

    return len(leaderboard['scores']) < original_count


def delete_replay_file(session_hash: str, replay_dir: str = 'data/replays') -> bool:
    """
    Delete replay file for a given session hash

    Args:
        session_hash: Session hash
        replay_dir: Directory containing replay files

    Returns:
        True if file was deleted
    """
    filepath = os.path.join(replay_dir, f"{session_hash}.json")

    if not os.path.exists(filepath):
        return False

    try:
        os.remove(filepath)
        return True
    except Exception as e:
        print(f"Error deleting replay file: {e}")
        return False


def interactive_moderation(
    leaderboard: Dict[str, Any],
    flag_threshold: int = 3
) -> None:
    """
    Interactive moderation workflow

    Args:
        leaderboard: Leaderboard data
        flag_threshold: Minimum flag count
    """
    flagged = list_flagged_scores(leaderboard, flag_threshold)

    if not flagged:
        print("No scores need moderation.")
        return

    print_flagged_scores(flagged)

    print("\n" + "="*80)
    print("MODERATION ACTIONS")
    print("="*80)
    print("\nOptions:")
    print("  1. Delete a score by session hash")
    print("  2. Change flag threshold")
    print("  3. Exit without changes")

    choice = input("\nEnter choice (1-3): ").strip()

    if choice == '1':
        session_hash = input("Enter session hash to delete (or 'cancel'): ").strip()

        if session_hash.lower() == 'cancel':
            print("Cancelled.")
            return

        # Confirm deletion
        score_to_delete = None
        for score in flagged:
            if score['sessionHash'] == session_hash:
                score_to_delete = score
                break

        if not score_to_delete:
            print(f"Error: Session hash '{session_hash}' not found in flagged scores.")
            return

        print(f"\nDeleting score:")
        print(f"  User: {score_to_delete['initials']}")
        print(f"  Performance: {score_to_delete['wpm']} WPM")
        print(f"  Flags: {score_to_delete['flags']}")

        confirm = input("\nConfirm deletion? (yes/no): ").strip().lower()

        if confirm == 'yes':
            if delete_score_by_hash(leaderboard, session_hash):
                print("✓ Score deleted from leaderboard")

                # Also delete replay file
                if delete_replay_file(session_hash):
                    print("✓ Replay file deleted")
                else:
                    print("⚠ Replay file not found or couldn't be deleted")

                # Save updated leaderboard
                if save_leaderboard(leaderboard):
                    print("✓ Leaderboard saved")
                else:
                    print("✗ Failed to save leaderboard")
            else:
                print("✗ Failed to delete score")
        else:
            print("Deletion cancelled.")

    elif choice == '2':
        new_threshold = input(f"Enter new flag threshold (current: {flag_threshold}): ").strip()

        try:
            new_threshold = int(new_threshold)
            if new_threshold < 1:
                print("Threshold must be at least 1")
            else:
                # Re-run with new threshold
                interactive_moderation(leaderboard, new_threshold)
        except ValueError:
            print("Invalid threshold value")

    else:
        print("Exiting without changes.")


def batch_delete_flagged(
    leaderboard: Dict[str, Any],
    flag_threshold: int = 5,
    auto_save: bool = False
) -> int:
    """
    Batch delete all scores with flags above threshold

    Args:
        leaderboard: Leaderboard data (modified in place)
        flag_threshold: Minimum flag count for auto-deletion
        auto_save: Whether to save automatically

    Returns:
        Number of scores deleted
    """
    flagged = list_flagged_scores(leaderboard, flag_threshold)

    if not flagged:
        print("No scores meet deletion criteria.")
        return 0

    print(f"\nFound {len(flagged)} scores with {flag_threshold}+ flags")

    for score in flagged:
        print(f"  - {score['initials']}: {score['wpm']} WPM, {score['flags']} flags")

    confirm = input(f"\nDelete all {len(flagged)} scores? (yes/no): ").strip().lower()

    if confirm != 'yes':
        print("Batch deletion cancelled.")
        return 0

    deleted = 0
    for score in flagged:
        if delete_score_by_hash(leaderboard, score['sessionHash']):
            deleted += 1
            delete_replay_file(score['sessionHash'])

    print(f"✓ Deleted {deleted} scores")

    if auto_save and deleted > 0:
        if save_leaderboard(leaderboard):
            print("✓ Leaderboard saved")
        else:
            print("✗ Failed to save leaderboard")

    return deleted


def main():
    """Main entry point for moderation tool"""
    print("\n" + "="*80)
    print("LEADERBOARD MODERATION TOOL")
    print("="*80)

    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--help':
            print("\nUsage:")
            print("  python moderate_scores.py           # Interactive mode")
            print("  python moderate_scores.py --list    # List flagged scores")
            print("  python moderate_scores.py --batch   # Batch delete flagged scores")
            print("  python moderate_scores.py --help    # Show this help")
            return

        leaderboard = load_leaderboard()

        if sys.argv[1] == '--list':
            flagged = list_flagged_scores(leaderboard)
            print_flagged_scores(flagged)

        elif sys.argv[1] == '--batch':
            threshold = 5
            if len(sys.argv) > 2:
                try:
                    threshold = int(sys.argv[2])
                except ValueError:
                    print(f"Invalid threshold: {sys.argv[2]}")
                    return

            batch_delete_flagged(leaderboard, threshold, auto_save=True)

        else:
            print(f"Unknown option: {sys.argv[1]}")
            print("Use --help for usage information")

    else:
        # Interactive mode
        leaderboard = load_leaderboard()
        interactive_moderation(leaderboard)


if __name__ == "__main__":
    main()