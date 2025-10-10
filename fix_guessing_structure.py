#!/usr/bin/env python3
"""
모든 lesson JSON 파일의 게싱 구조를 수정하는 스크립트
- 옵션 순서를 A, B, C로 정렬
- 정답을 비디오와 일치하는 옵션으로 설정
"""

import json
import os
import random

def fix_guessing_structure(lesson_file):
    """단일 lesson 파일의 게싱 구조를 수정"""
    print(f"수정 중: {lesson_file}")
    
    with open(lesson_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'guessing' not in data:
        print(f"  {lesson_file}에 guessing 데이터가 없습니다.")
        return
    
    for question in data['guessing']:
        # 현재 옵션들을 수집
        options = question['options']
        
        # 비디오 시간과 일치하는 옵션 찾기
        video_start = question['video']['start']
        video_end = question['video']['end']
        
        correct_option = None
        other_options = []
        
        for option in options:
            if option['start'] == video_start and option['end'] == video_end:
                correct_option = option
            else:
                other_options.append(option)
        
        if not correct_option:
            print(f"  경고: {lesson_file} Question {question['question']}에서 비디오와 일치하는 옵션을 찾을 수 없습니다.")
            continue
        
        # A, B, C 순서로 정렬
        new_options = []
        
        # 정답을 A, B, C 중 랜덤하게 배치
        correct_label = random.choice(['A', 'B', 'C'])
        
        # 정답 옵션 설정
        correct_option['label'] = correct_label
        new_options.append(correct_option)
        
        # 나머지 옵션들을 나머지 라벨로 배치
        remaining_labels = [label for label in ['A', 'B', 'C'] if label != correct_label]
        for i, option in enumerate(other_options):
            option['label'] = remaining_labels[i]
            new_options.append(option)
        
        # A, B, C 순서로 정렬
        new_options.sort(key=lambda x: x['label'])
        
        # 정답 라벨 업데이트
        question['correctAnswer'] = correct_label
        question['options'] = new_options
        
        print(f"  Question {question['question']}: 정답 {correct_label}")
    
    # 파일 저장
    with open(lesson_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"  완료: {lesson_file}")

def main():
    """모든 lesson 파일을 수정"""
    lessons_dir = "public/movies/sing2"
    
    # lesson-1.json ~ lesson-12.json 처리
    for i in range(1, 13):
        lesson_file = os.path.join(lessons_dir, f"lesson-{i}.json")
        if os.path.exists(lesson_file):
            fix_guessing_structure(lesson_file)
        else:
            print(f"파일이 존재하지 않습니다: {lesson_file}")
    
    print("\n모든 lesson 파일 수정 완료!")

if __name__ == "__main__":
    main()
