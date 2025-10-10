#!/usr/bin/env python3
import json
import random
from pathlib import Path

def create_guessing_questions(mimicking_lines):
    """Create 10 evenly distributed guessing questions from 30 mimicking lines."""
    # Select every 3rd line starting from index 2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]
    selected_indices = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]

    questions = []
    for q_num, correct_idx in enumerate(selected_indices, 1):
        correct_line = mimicking_lines[correct_idx]

        # Get 2 random distractor lines (not the correct one)
        available_indices = [i for i in range(len(mimicking_lines)) if i != correct_idx]
        distractor_indices = random.sample(available_indices, 2)

        # Randomly assign labels A, B, C
        labels = ['A', 'B', 'C']
        random.shuffle(labels)
        correct_label = labels[0]

        options = []
        options.append({
            "label": labels[0],
            "text": correct_line["text"],
            "start": correct_line["start"],
            "end": correct_line["end"]
        })
        options.append({
            "label": labels[1],
            "text": mimicking_lines[distractor_indices[0]]["text"],
            "start": mimicking_lines[distractor_indices[0]]["start"],
            "end": mimicking_lines[distractor_indices[0]]["end"]
        })
        options.append({
            "label": labels[2],
            "text": mimicking_lines[distractor_indices[1]]["text"],
            "start": mimicking_lines[distractor_indices[1]]["start"],
            "end": mimicking_lines[distractor_indices[1]]["end"]
        })

        question = {
            "question": q_num,
            "correctAnswer": correct_label,
            "options": options,
            "video": {
                "start": correct_line["start"],
                "end": correct_line["end"]
            }
        }
        questions.append(question)

    return questions

# Process each lesson file
base_path = Path("/Users/kangjinlee/Desktop/미믹/practice/public/movies/sing2")

for lesson_num in range(1, 13):
    lesson_file = base_path / f"lesson-{lesson_num}.json"

    # Read the lesson file
    with open(lesson_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Generate new guessing section
    data["guessing"] = create_guessing_questions(data["mimicking"])

    # Write back to file
    with open(lesson_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Regenerated guessing section for lesson-{lesson_num}.json")

print("\n🎉 All lessons updated with evenly distributed guessing questions!")
