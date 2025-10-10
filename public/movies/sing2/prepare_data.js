const fs = require('fs');
const path = require('path');

// [중요] video_id는 1로 고정합니다.
const VIDEO_ID = 1; 

function timeToSeconds(timeStr) {
    // "00:06:37,549" 형식을 초로 변환
    const [h, m, s_ms] = timeStr.split(':');
    const [s] = s_ms.split(',');
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

const lessons = [];

// Lesson 2부터 12까지 처리
for (let i = 2; i <= 12; i++) {
    const filename = `lesson-${i}.json`;
    try {
        const filePath = path.join(__dirname, filename);
        // 파일 읽기
        const data = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(data);

        // 시간 변환
        const startSec = timeToSeconds(json.watching.start);
        const endSec = timeToSeconds(json.watching.end);

        // JSONB 데이터를 SQL 문자열에 맞게 이스케이프 (작은따옴표로 감싸기)
        const mimicData = JSON.stringify(json.mimicking).replace(/'/g, "''");
        const guessingData = JSON.stringify(json.guessing).replace(/'/g, "''");
        const wordData = JSON.stringify(json.word).replace(/'/g, "''");

        // SQL VALUES 구문 생성
        lessons.push(
            `(${VIDEO_ID}, ${i}, ${startSec}, ${endSec}, E'${mimicData}', E'${guessingData}', E'${wordData}')`
        );
    } catch (e) {
        console.error(`Error processing ${filename}:`, e.message);
    }
}

// 최종 SQL 쿼리 생성
const sqlQuery = `
INSERT INTO lessons (video_id, lesson_number, watch_start_sec, watch_end_sec, mimic_data, guessing_data, word_data)
VALUES
    ${lessons.join(',\n    ')};
`;

// 결과를 final_lessons_insert.sql 파일로 저장
const outputFilename = 'final_lessons_insert.sql';
fs.writeFileSync(outputFilename, sqlQuery);

console.log(`\n✅ Lesson 2부터 12까지의 데이터가 ${outputFilename} 파일에 저장되었습니다.`);
console.log('이제 Supabase SQL Editor에서 이 파일의 내용을 복사하여 실행하세요!');