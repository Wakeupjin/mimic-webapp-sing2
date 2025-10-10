#!/usr/bin/env python3
"""
빠른 lesson 수정 스크립트
"""

import json
import os
import random

def quick_fix_lesson(lesson_file):
    """lesson 파일을 빠르게 수정"""
    print(f"수정 중: {lesson_file}")
    
    try:
        with open(lesson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'guessing' not in data:
            print(f"  {lesson_file}에 guessing 데이터가 없습니다.")
            return
        
        for question in data['guessing']:
            # 옵션들을 A, B, C 순서로 정렬
            options = question['options']
            
            # 비디오와 일치하는 옵션 찾기
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
                print(f"  경고: Question {question['question']}에서 비디오와 일치하는 옵션을 찾을 수 없습니다.")
                continue
            
            # A, B, C 순서로 정렬
            correct_option['label'] = 'A'
            other_options[0]['label'] = 'B'
            other_options[1]['label'] = 'C'
            
            # A, B, C 순서로 정렬
            new_options = [correct_option] + other_options
            new_options.sort(key=lambda x: x['label'])
            
            # 정답 업데이트
            question['correctAnswer'] = 'A'
            question['options'] = new_options
        
        # 파일 저장
        with open(lesson_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"  완료: {lesson_file}")
        
    except Exception as e:
        print(f"  오류: {lesson_file} - {e}")

def main():
    """모든 lesson 파일을 수정"""
    lessons_dir = "public/movies/sing2"
    
    # lesson-5.json ~ lesson-12.json 처리
    for i in range(5, 13):
        lesson_file = os.path.join(lessons_dir, f"lesson-{i}.json")
        if os.path.exists(lesson_file):
            quick_fix_lesson(lesson_file)
        else:
            print(f"파일이 존재하지 않습니다: {lesson_file}")
    
    print("\n모든 lesson 파일 수정 완료!")

if __name__ == "__main__":
    main()
