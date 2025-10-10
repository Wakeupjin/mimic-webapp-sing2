import json
import os

# Process each lesson file
for lesson_num in range(1, 13):
    file_path = f'public/movies/sing2/lesson-{lesson_num}.json'

    print(f"\n{'='*60}")
    print(f"Processing {file_path}...")
    print(f"{'='*60}")

    # Read the lesson file
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Skip if word section already exists
    if 'word' in data:
        print(f"✓ Word section already exists in lesson-{lesson_num}.json")
        continue

    # Get guessing timestamps
    guessing_timestamps = set()
    for question in data['guessing']:
        video = question['video']
        guessing_timestamps.add((video['start'], video['end']))

    print(f"Found {len(guessing_timestamps)} guessing questions")

    # Filter mimicking lines that are NOT used in guessing
    available_for_word = []
    for line in data['mimicking']:
        if (line['start'], line['end']) not in guessing_timestamps:
            available_for_word.append(line)

    print(f"Found {len(available_for_word)} mimicking lines available for word quiz")

    # Select first 10 for word quiz (they're already in order from the video)
    word_questions = []
    for i, line in enumerate(available_for_word[:10]):
        word_questions.append({
            "question": i + 1,
            "start": line['start'],
            "end": line['end'],
            "text": line['text']
        })

    print(f"Created {len(word_questions)} word questions")

    # Add word section to data
    data['word'] = word_questions

    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Successfully added word section to lesson-{lesson_num}.json")

    # Print the questions for review
    print(f"\nWord questions for lesson-{lesson_num}:")
    for i, q in enumerate(word_questions, 1):
        print(f"  {i}. {q['text']}")

print(f"\n{'='*60}")
print("All lessons processed!")
print(f"{'='*60}")
